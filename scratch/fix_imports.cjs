const fs = require('fs');
const allFiles = [
  'src/services/PipelineService.ts',
  'src/services/SandboxEngine.ts',
  'src/services/StagingService.ts',
  'src/services/TestRunnerService.ts',
  'src/utils/FileGuard.ts',
  'src/utils/SecurityUtils.ts',
  'src/utils/ShellSecurityEngine.ts'
];
for (const f of allFiles) {
  const c = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, c.replace(/from '\.\.\/\.\.\/types\/ErrorSystem\.js'/g, "from '../types/ErrorSystem.js'"));
}
console.log('Fixed imports');
