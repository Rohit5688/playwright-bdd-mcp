const fs = require('fs');

let indexTs = fs.readFileSync('src/index.ts', 'utf8');
const migratedTools = fs.readFileSync('migrated_tools.ts', 'utf8');

// Use regex to remove lines containing CallToolRequestSchema
indexTs = indexTs.replace(/import\s*\{[^}]*CallToolRequestSchema[^}]*\}\s*from\s*"@modelcontextprotocol\/sdk\/types\.js";/m, '');

const listToolsIndex = indexTs.indexOf('server.setRequestHandler(ListToolsRequestSchema,');
const callToolEndIndex = indexTs.search(/\}\);\r?\n\/\/ CLI setup for Stdio vs SSE/);

if (listToolsIndex !== -1 && callToolEndIndex !== -1) {
  const beforeTools = indexTs.slice(0, listToolsIndex);
  
  // Extract from callToolEndIndex to the `\n// CLI setup` part
  const match = indexTs.match(/\}\);\r?\n\/\/ CLI setup for Stdio vs SSE/);
  const afterTools = indexTs.slice(callToolEndIndex + match[0].length - '// CLI setup for Stdio vs SSE'.length);
  
  indexTs = beforeTools + migratedTools + '\n' + afterTools;
} else {
  console.log("Indices not found", listToolsIndex, callToolEndIndex);
}

fs.writeFileSync('src/index.ts', indexTs, 'utf8');
