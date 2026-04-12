import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'path';
import { sanitizeOutput, validateProjectPath, sanitizeShellArg, auditGeneratedCode } from '../utils/SecurityUtils.js';
describe('SecurityUtils - Phase 35 Smoke Tests', () => {
    test('validateProjectPath should block path traversal', () => {
        const projectRoot = path.resolve('/fake/project');
        // Valid path
        assert.doesNotThrow(() => validateProjectPath(projectRoot, 'features/login.feature'));
        // Traversal attempts
        assert.throws(() => validateProjectPath(projectRoot, '../etc/passwd'), /Permission denied/);
        assert.throws(() => validateProjectPath(projectRoot, 'features/../../etc/passwd'), /Permission denied/);
        // Absolute path outside root
        assert.throws(() => validateProjectPath(projectRoot, '/etc/passwd'), /Permission denied/);
    });
    test('sanitizeShellArg should drop dangerous metacharacters', () => {
        assert.equal(sanitizeShellArg('--grep @smoke'), '--grep @smoke');
        assert.equal(sanitizeShellArg('rm -rf / ; echo "hello"'), 'rm -rf /  echo "hello"');
        assert.equal(sanitizeShellArg('test && cat .env'), 'test  cat .env');
        assert.equal(sanitizeShellArg('$(whoami)'), 'whoami');
    });
    test('sanitizeOutput should redact secrets', () => {
        const output = `
      API_KEY=12345secret
      password: "my_super_secret"
      Authorization: Bearer super_long_jwt_token_over_20_chars
    `;
        const clean = sanitizeOutput(output);
        console.log("CLEAN OUTPUT:", clean);
        assert.ok(clean.includes('API_KEY=[REDACTED]'), 'API Key not redacted');
        assert.ok(clean.includes('password: "[REDACTED]"'), 'Password not redacted');
        assert.ok(clean.includes('Authorization: Bearer [REDACTED]'), 'Bearer token not redacted');
    });
    test('auditGeneratedCode should detect hardcoded credentials', () => {
        const files = [
            { path: 'pages/Login.ts', content: "const login = { password: 'supersecret123' };" },
            { path: 'pages/Api.ts', content: 'const req = { Authorization: "Bearer my-token-12345-long" };' },
            { path: 'pages/Safe.ts', content: 'const p = process.env.PASSWORD;' }
        ];
        const violations = auditGeneratedCode(files);
        console.log("VIOLATIONS:", violations);
        assert.equal(violations.length, 2, 'Should detect exactly 2 violations');
        assert.ok(violations.some(v => v.includes('Hardcoded password value')));
        assert.ok(violations.some(v => v.includes('Hardcoded Bearer token')));
    });
});
//# sourceMappingURL=SecurityUtils.test.js.map