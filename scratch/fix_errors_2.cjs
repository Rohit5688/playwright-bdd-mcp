const fs = require('fs');

function fixRegex(file, pattern, replacement) {
  let content = fs.readFileSync(file, 'utf8');
  if (!pattern.test(content)) {
     console.log('Skip ' + file + ' for pattern ' + pattern);
     return;
  }
  content = content.replace(pattern, replacement);
  if (!content.includes('import { McpError') && !content.includes('import { McpErrors')) {
    let importDepth = file.split('/').length > 2 ? '../../' : '../';
    if (file.includes('src/index.ts') || file.includes('src\\\\index.ts')) importDepth = './';
    content = `import { McpErrors, McpError, McpErrorCode } from '${importDepth}types/ErrorSystem.js';\n` + content;
  }
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}

fixRegex('src/utils/SecurityUtils.ts', 
  /throw new Error\(\s*'mcp-config\.json is not valid JSON'\s*\);?/g,
  'throw McpErrors.configValidationFailed("mcp-config.json is not valid JSON");'
);

fixRegex('src/utils/SecurityUtils.ts', 
  /throw new Error\([\s\S]*?'Security Error: .*\\n' \+[\s\S]*?\);/g,
  'throw McpErrors.projectValidationFailed("Security Error: Malicious generated code detected. It contains eval or shell exec patterns string. This is strictly prohibited inside tests.");'
);

fixRegex('src/services/FileStateService.ts',
  /throw new Error\([\s\S]*?`Concurrent file modification detected for \$\{filePath\}: Please run tool again.`[\s\S]*?\);?/g,
  'throw McpErrors.fileModifiedExternally(filePath);'
);

fixRegex('src/services/ProjectSetupService.ts',
  /throw new Error\([\s\S]*?`mcp-config\.json already exists in \$\{projectRoot\}\. Use manage_config if you need to update it\.`[\s\S]*?\);?/g,
  'throw McpErrors.projectValidationFailed(`mcp-config.json already exists in ${projectRoot}. Use manage_config if you need to update it.`);'
);

fixRegex('src/services/SandboxEngine.ts',
  /throw new Error\([\s\S]*?Cannot evaluate untrusted string in execute_sandbox_code[\s\S]*?\);?/g,
  'throw McpErrors.invalidParameter("script", "Cannot evaluate untrusted string in execute_sandbox_code. You MUST use string arguments directly instead of passing AST or interpolations.");'
);

fixRegex('src/services/TestRunnerService.ts',
  /throw new Error\([\s\S]*?does not appear to be an AppForge\/TestForge compatible Playwright or WebdriverIO setup[\s\S]*?\);?/g,
  'throw McpErrors.projectValidationFailed(`Project at ${projectRoot} does not appear to be an AppForge/TestForge compatible Playwright or WebdriverIO setup. Cannot run tests.`);'
);

fixRegex('src/services/UserStoreService.ts',
  /throw new Error\(\s*`File \$\{absPath\} belongs to a git repository but is inexplicably not ignored\.[\s\S]*?`\s*\);?/g,
  'throw McpErrors.projectValidationFailed(`File ${absPath} belongs to a git repository but is inexplicably not ignored. You MUST update .gitignore before executing credential injections.`);'
);

fixRegex('src/services/UserStoreService.ts',
  /throw new Error\([\s\S]*?Missing users\.json content in users Object[\s\S]*?\);?/g,
  'throw McpErrors.invalidParameter("users", "Missing users array");'
);

fixRegex('src/services/UserStoreService.ts',
  /throw new Error\([\s\S]*?Users object must be an Array[\s\S]*?\);?/g,
  'throw McpErrors.invalidParameter("users", "Users object must be an Array");'
);

fixRegex('src/services/UserStoreService.ts',
  /throw new Error\([\s\S]*?User .* missing password[\s\S]*?\);?/g,
  'throw McpErrors.invalidCredential(`User missing password`);'
);

fixRegex('src/services/UserStoreService.ts',
  /throw new Error\([\s\S]*?Missing target environment parameter[\s\S]*?\);?/g,
  'throw McpErrors.invalidParameter("env", "Missing target environment parameter");'
);

fixRegex('src/index.ts',
  /throw new Error\("\'write\' action requires an \'entries\' array of \{key, value\} objects\."\);?/g,
  'throw McpErrors.invalidParameter("entries", "\\\'write\\\' action requires an \\\'entries\\\' array of {key, value} objects.");'
);

fixRegex('src/index.ts',
  /throw new Error\(`Unknown manage_env action: \$\{action\}\. Valid values: read, write, scaffold`\);?/g,
  'throw McpErrors.invalidParameter("action", `Unknown manage_env action: ${action}. Valid values: read, write, scaffold`);'
);

fixRegex('src/index.ts',
  /throw new Error\("\'preview\' action requires a \'config\' object\."\);?/g,
  'throw McpErrors.invalidParameter("config", "\\\'preview\\\' action requires a \\\'config\\\' object.");'
);

fixRegex('src/index.ts',
  /throw new Error\("\'write\' action requires a \'config\' object\."\);?/g,
  'throw McpErrors.invalidParameter("config", "\\\'write\\\' action requires a \\\'config\\\' object.");'
);

fixRegex('src/index.ts',
  /throw new Error\(`Unknown manage_config action: \$\{action\}\. Valid values: read, write, preview, scaffold`\);?/g,
  'throw McpErrors.invalidParameter("action", `Unknown manage_config action: ${action}. Valid values: read, write, preview, scaffold`);'
);

fixRegex('src/index.ts',
  /throw new Error\("\'add-role\' action requires a \'roles\' array\."\);?/g,
  'throw McpErrors.invalidParameter("roles", "\\\'add-role\\\' action requires a \\\'roles\\\' array.");'
);

fixRegex('src/index.ts',
  /throw new Error\(`Unknown manage_users action: \$\{action\}\. Valid values: list, add-role, scaffold`\);?/g,
  'throw McpErrors.invalidParameter("action", `Unknown manage_users action: ${action}. Valid values: list, add-role, scaffold`);'
);

fixRegex('src/index.ts',
  /throw new Error\(`\[SECURITY\] Path traversal blocked\. "\$\{dir\}" resolves outside projectRoot\.`\);?/g,
  'throw McpErrors.permissionDenied(dir);'
);

fixRegex('src/index.ts',
  /throw new Error\(`\[SECURITY\] Path traversal blocked\. "\$\{filePath\}" resolves outside projectRoot\.`\);?/g,
  'throw McpErrors.permissionDenied(filePath);'
);

fixRegex('src/index.ts',
  /throw new Error\(`\[SECURITY\] Path traversal blocked\.`\);?/g,
  'throw McpErrors.permissionDenied("");'
);

fixRegex('src/index.ts',
  /throw new Error\(`Directory not found: \$\{absDir\}`\);?/g,
  'throw McpErrors.fileNotFound(absDir);'
);

fixRegex('src/index.ts',
  /throw new Error\('Regex rejected: potential ReDoS'\);?/g,
  'throw McpErrors.invalidParameter("pattern", "Regex rejected: potential ReDoS");'
);

fixRegex('src/index.ts',
  /throw new Error\('Invalid regex pattern'\);?/g,
  'throw McpErrors.invalidParameter("pattern", "Invalid regex pattern");'
);

fixRegex('src/index.ts',
  /throw new Error\('typescript package not available'\);?/g,
  'throw McpErrors.projectValidationFailed("typescript package not available");'
);

fixRegex('src/index.ts',
  /throw new Error\(`File not found: \$\{absPath\}`\);?/g,
  'throw McpErrors.fileNotFound(absPath);'
);

fixRegex('src/index.ts',
  /throw new Error\(`File too large: \$\{absPath\}`\);?/g,
  'throw new McpError(`File too large: ${absPath}`, McpErrorCode.FILE_TOO_LARGE);'
);

fixRegex('src/index.ts',
  /throw new Error\(`Environment variable "\$\{key\}" is not on the allowlist\.`\);?/g,
  'throw McpErrors.permissionDenied(key, `Environment variable "${key}" is not on the allowlist.`);'
);

fixRegex('src/services/PipelineService.ts',
  /throw new Error\(`Unsupported pipeline provider: \$\{options\.provider\}`\);?/g,
  'throw McpErrors.invalidParameter("provider", `Unsupported pipeline provider: ${options.provider}`);'
);


console.log('Done script run 2!');
