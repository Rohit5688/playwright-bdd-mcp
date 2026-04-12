const fs = require('fs');
const filePath = 'C:/Users/Rohit/mcp/TestForge/src/index.ts';
let code = fs.readFileSync(filePath, 'utf8');
const outputInstr = '\n\nOUTPUT INSTRUCTIONS: Do NOT repeat file path or parameters. Do NOT summarise what you just did. Acknowledge in ≤10 words, then proceed. Keep response under 100 words unless explaining an error.';

// We need to carefully append this output instruction to the end of every description field before the closing quote/backtick
const newCode = code.replace(/description:\s*(`[^`]*`|\"[^\"]*\"|'[^']*')/g, (match, stringLiteral) => {
    if (match.includes('OUTPUT INSTRUCTIONS:')) return match; // Already has it
    
    // Determine the type of quote used
    const firstChar = stringLiteral[0];
    const lastChar = stringLiteral[stringLiteral.length - 1];
    const content = stringLiteral.slice(1, -1);
    
    // We add the output instruction inside the string
    return `description: ${firstChar}${content}${outputInstr}${lastChar}`;
});

fs.writeFileSync(filePath, newCode, 'utf8');
console.log('Descriptions patched. Changes saved to', filePath);
