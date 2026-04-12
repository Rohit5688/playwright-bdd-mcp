const fs = require('fs');

const indexTsPath = 'c:\\\\Users\\\\Rohit\\\\mcp\\\\TestForge\\\\src\\\\index.ts';
let code = fs.readFileSync(indexTsPath, 'utf8');

const mapping = require('./retool.json');

for (const [toolName, description] of Object.entries(mapping)) {
  const regex = new RegExp(`name:\\\\s*['"]${toolName}['"],\\\\s*description:\\\\s*['"\`][\\\\s\\\\S]*?['"\`],`, 'g');
  const replacement = `name: "${toolName}",\\n      description: "${description}",`;
  code = code.replace(regex, replacement);
}

fs.writeFileSync(indexTsPath, code, 'utf8');
console.log('Done!');
