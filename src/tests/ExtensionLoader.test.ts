import { ExtensionLoader } from '../utils/ExtensionLoader.js';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, before, after, afterEach } from 'node:test';
import * as assert from 'node:assert';

describe('ExtensionLoader', () => {
  const testProjectRoot = path.join(process.cwd(), '__mock_extension_project');

  before(() => {
    if (!fs.existsSync(testProjectRoot)) {
      fs.mkdirSync(testProjectRoot, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(testProjectRoot)) {
      fs.rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up files after each test
    const files = ['feature-flags.json', 'logger-config.json', 'api-registry.json'];
    files.forEach(f => {
      const p = path.join(testProjectRoot, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  });

  it('should return empty string if no extensions exist', () => {
    const result = ExtensionLoader.loadExtensionsForPrompt(testProjectRoot);
    assert.strictEqual(result, '');
  });

  it('should format feature flags when present', () => {
    fs.writeFileSync(path.join(testProjectRoot, 'feature-flags.json'), JSON.stringify({ enableNewUI: true }));
    const result = ExtensionLoader.loadExtensionsForPrompt(testProjectRoot);
    assert.ok(result.includes('=== PROJECT EXTENSIONS ==='));
    assert.ok(result.includes('--- FEATURE FLAGS ---'));
    assert.ok(result.includes('"enableNewUI": true'));
  });

  it('should collect multiple extensions when present', () => {
    fs.writeFileSync(path.join(testProjectRoot, 'feature-flags.json'), JSON.stringify({ featA: false }));
    fs.writeFileSync(path.join(testProjectRoot, 'api-registry.json'), JSON.stringify({ userApi: "http://localhost:3000" }));
    const result = ExtensionLoader.loadExtensionsForPrompt(testProjectRoot);
    assert.ok(result.includes('--- FEATURE FLAGS ---'));
    assert.ok(result.includes('--- API REGISTRY ---'));
    assert.ok(result.includes('"userApi": "http://localhost:3000"'));
    assert.ok(result.includes('"featA": false'));
  });

  it('should handle malformed json gracefully', () => {
    fs.writeFileSync(path.join(testProjectRoot, 'feature-flags.json'), '{ badJson: ');
    const result = ExtensionLoader.loadExtensionsForPrompt(testProjectRoot);
    assert.strictEqual(result, ''); // Should not throw
  });

  it('should load additionalDataPaths listed in mcp-config.json', () => {
    const docsDir = path.join(testProjectRoot, 'docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'custom.json'), JSON.stringify({ myKey: 'myValue' }));
    fs.writeFileSync(path.join(testProjectRoot, 'mcp-config.json'), JSON.stringify({ additionalDataPaths: ['docs/custom.json'] }));
    const result = ExtensionLoader.loadExtensionsForPrompt(testProjectRoot);
    assert.ok(result.includes('CUSTOM.JSON'), 'Label should be uppercased filename');
    assert.ok(result.includes('myValue'));
    // Cleanup
    fs.unlinkSync(path.join(testProjectRoot, 'mcp-config.json'));
    fs.rmSync(docsDir, { recursive: true, force: true });
  });

  it('should skip non-existent additionalDataPaths entries without throwing', () => {
    fs.writeFileSync(path.join(testProjectRoot, 'mcp-config.json'), JSON.stringify({ additionalDataPaths: ['does-not-exist.json'] }));
    assert.doesNotThrow(() => ExtensionLoader.loadExtensionsForPrompt(testProjectRoot));
    fs.unlinkSync(path.join(testProjectRoot, 'mcp-config.json'));
  });
});
