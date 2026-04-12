const fs = require('fs');

function fix(file, from, to) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(from)) {
     console.log('Skip ' + file);
     return;
  }
  content = content.replace(from, to);
  if (!content.includes('import { McpError') && !content.includes('import { McpErrors')) {
    let importDepth = file.split('/').length > 2 ? '../../' : '../';
    if (file.includes('src/index.ts')) importDepth = './';
    content = `import { McpErrors, McpError, McpErrorCode } from '${importDepth}types/ErrorSystem.js';\n` + content;
  }
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}

fix('src/utils/ShellSecurityEngine.ts', 
  'if (!check.safe) throw new Error(`Shell injection blocked: ${check.violations[0].pattern}`);',
  'if (!check.safe) throw McpErrors.shellInjectionDetected(check.violations[0].pattern);');

fix('src/utils/ShellSecurityEngine.ts', 
  'if (!pathCheck.safe) throw new Error(`Path injection blocked: ${pathCheck.violations[0].input}`);',
  'if (!pathCheck.safe) throw McpErrors.shellInjectionDetected(pathCheck.violations[0].input);');

fix('src/utils/FileGuard.ts',
  'throw new Error(`FileGuard blocked read: "${filePath}" appears to be a binary file. Reading binary files as text is not allowed.`);',
  'throw McpErrors.binaryFileRejected(filePath, "Reading binary files as text is not allowed.");');

fix('src/services/FileStateService.ts',
  'throw new Error(\n        `Concurrent file modification detected for ${filePath}: Please run tool again.`\n      );',
  'throw McpErrors.fileModifiedExternally(filePath);');

fix('src/services/ProjectSetupService.ts',
  'throw new Error(\n        `mcp-config.json already exists in ${projectRoot}. Use manage_config if you need to update it.`\n      );',
  'throw McpErrors.projectValidationFailed(`mcp-config.json already exists in ${projectRoot}. Use manage_config if you need to update it.`);');

fix('src/services/SandboxEngine.ts',
  'throw new Error(\n      \'Cannot evaluate untrusted string in execute_sandbox_code. You MUST use string arguments directly instead of passing AST or interpolations.\'\n    );',
  'throw McpErrors.invalidParameter("script", "Cannot evaluate untrusted string in execute_sandbox_code. You MUST use string arguments directly instead of passing AST or interpolations.");');

fix('src/services/SandboxEngine.ts',
  'throw new Error(`forge.api.${name}() failed: ${(err as Error).message}`);',
  'throw McpErrors.sandboxApiFailed(`forge.api.${name}() failed`, err as Error);');

fix('src/services/StagingService.ts',
  "throw new Error('TypeScript compilation failed in staging:\\n' + errors.join('\\n'));",
  "throw new McpError('TypeScript compilation failed in staging:\\n' + errors.join('\\n'), McpErrorCode.TS_COMPILE_FAILED);");

fix('src/services/TestRunnerService.ts',
  'if (!exe) throw new Error(`Invalid execution segment: ${cmdStr}`);',
  'if (!exe) throw McpErrors.invalidExecutable(cmdStr);');

fix('src/services/TestRunnerService.ts',
  'throw new Error(`Invalid executable path: ${exe}`);',
  'throw McpErrors.invalidExecutable(exe);');

fix('src/services/TestRunnerService.ts',
  'throw new Error(\n            `Project at ${projectRoot} does not appear to be an AppForge/TestForge compatible Playwright or WebdriverIO setup. Cannot run tests.`\n          );',
  'throw McpErrors.projectValidationFailed(`Project at ${projectRoot} does not appear to be an AppForge/TestForge compatible Playwright or WebdriverIO setup. Cannot run tests.`);');

console.log('Done script run 1!');
