const fs = require('fs');

let indexTs = fs.readFileSync('src/index.ts', 'utf8');

// We will use regex to find server.tool(...)
// The call structure:
// server.tool(
//   "toolname",
//   "description",
//   z.object({ ... }),
//   async (args) => {
// We want to transform it into:
// server.registerTool(
//   "toolname",
//   {
//       description: "description",
//       inputSchema: z.object({ ... }),
//       annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
//   },
//   async (args) => {

indexTs = indexTs.replace(/server\.tool\(\s*"([^"]+)",\s*(".*?"|[\s\S]*?(?=\s*,\s*z\.object)),\s*(z\.object\([\s\S]*?\)),\s*async\s*\(\s*args\s*\)\s*=>\s*\{/g, (match, name, desc, schema) => {
  return `server.registerTool(
    "${name}",
    {
      description: ${desc},
      inputSchema: ${schema},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async (args) => {`;
});


fs.writeFileSync('src/index.ts', indexTs, 'utf8');
