const fs = require('fs');

let t = fs.readFileSync('src/index.ts', 'utf8');

// Also inject imports at the top
const imports = `import { textResult, truncate } from "./utils/responseHelper.js";\n`;

if (!t.includes('textResult')) {
    const importMatch = t.match(/import .*?;/);
    if (importMatch) {
        t = t.replace(importMatch[0], imports + importMatch[0]);
    }
}

// Very simplistic string replace for one-liners
// e.g. return { content: [{ type: "text", text: response }] };
t = t.replace(/return\s*\{\s*content:\s*\[\s*\{\s*type:\s*"text",\s*text:\s*([^}]*?)\s*\}\s*\]\s*\}\s*;/g, (match, expression) => {
    // If it's already using sanitizeOutput, maybe wrap it inside
    return `return textResult(truncate(${expression}));`;
});

fs.writeFileSync('src/index.ts', t, 'utf8');
