import { Project, SyntaxKind, ObjectLiteralExpression, Node } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

function schemaToZod(schema: any): string {
  if (!schema) return 'z.object({})';
  if (schema.type !== 'object') return 'z.any()';
  
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return 'z.object({})';
  }

  const props: string[] = [];
  const required = schema.required || [];

  for (const [key, prop] of Object.entries((schema as any).properties)) {
    let zType = 'z.any()';
    const p = prop as any;
    if (p.type === 'string') {
      if (p.enum) {
        zType = `z.enum([${p.enum.map((e: string) => `"${e}"`).join(', ')}])`;
      } else {
        zType = 'z.string()';
      }
    } else if (p.type === 'boolean') {
      zType = 'z.boolean()';
    } else if (p.type === 'number') {
      zType = 'z.number()';
    } else if (p.type === 'array') {
      if (p.items && p.items.type === 'string') {
        zType = 'z.array(z.string())';
      } else if (p.items && p.items.type === 'object') {
        zType = `z.array(${schemaToZod(p.items)})`;
      } else {
        zType = 'z.array(z.any())';
      }
    } else if (p.type === 'object') {
      zType = schemaToZod(p);
    }
    
    if (p.description) {
      zType += `.describe(${JSON.stringify(p.description)})`;
    }
    
    if (!required.includes(key)) {
      zType += '.optional()';
    }
    
    props.push(`"${key}": ${zType}`);
  }
  
  return `z.object({
${props.join(',\n')}
  })`;
}

async function main() {
  const projectRoot = process.cwd();
  const project = new Project({
    tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
  });

  const sourceFile = project.getSourceFileOrThrow('src/index.ts');
  
  const listToolsCall = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .find(c => c.getExpression().getText() === 'server.setRequestHandler' && 
               c.getArguments()[0]?.getText() === 'ListToolsRequestSchema');

  const callToolCall = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .find(c => c.getExpression().getText() === 'server.setRequestHandler' && 
               c.getArguments()[0]?.getText() === 'CallToolRequestSchema');

  if (!listToolsCall || !callToolCall) {
    console.error("Could not find setRequestHandler calls.");
    return;
  }

  // Extract tools array
  let toolsObj: any[] = [];
  const returnStmt = listToolsCall.getDescendantsOfKind(SyntaxKind.ReturnStatement)[0];
  if (returnStmt) {
    const objLit = returnStmt.getExpressionIfKind(SyntaxKind.ObjectLiteralExpression);
    if (objLit) {
      const toolsProp = objLit.getProperty('tools');
      if (toolsProp && Node.isPropertyAssignment(toolsProp)) {
        const arr = toolsProp.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
        if (arr) {
          // Eval the AST to JSON roughly
          // Simple trick: extract text and eval
          const text = arr.getText();
          toolsObj = eval('(' + text + ')');
        }
      }
    }
  }

  // Extract handlers from switch statement
  const switchStmt = callToolCall.getDescendantsOfKind(SyntaxKind.SwitchStatement)[0];
  const handlersMap = new Map<string, string>();
  
  if (switchStmt) {
    for (const clause of switchStmt.getCaseBlock().getClauses()) {
      if (Node.isCaseClause(clause)) {
        const expr = clause.getExpression();
        if (Node.isStringLiteral(expr)) {
          const toolName = expr.getLiteralValue();
          // Get the body text, strip the break/return statements at the end if needed, 
          // or just take the raw text. Let's just take all statements text.
          const statements = clause.getStatements().map(s => s.getText()).join('\\n');
          handlersMap.set(toolName, statements);
        }
      }
    }
  }

  let finalHandlers = [];

  for (const t of toolsObj) {
    const handlerBody = handlersMap.get(t.name) || `throw new Error(\"Not implemented\");`;
    const zodSchema = schemaToZod(t.inputSchema);
    
    // Convert handler body to map args correctly. 
    // The existing handlers destructure from args as any: const { x, y } = args as any;
    // This is fine with Zod, it will just be typed.
    
    // We need to implement ToolResponse wrapper as per TASK-23
    // Original returns `{ content: [{ type: "text", text: ... }] }`
    // We need to rewrite returns to use `textResult` helper if we create one, or just `return textResult(...)`
    
    // Actually, `McpServer.tool` requires returning `{ content: [...] }`. Wait, if we use `server.tool` from SDK, it requires returning `{ content: [...] }`.
    // We will just leave the returns as they are for now, or apply `textResult` replacement in text string.

    let replacedBody = handlerBody;
    
    const blockText = `
  server.tool(
    "${t.name}",
    ${JSON.stringify(t.description || '')},
    ${zodSchema},
    async (args) => {
      ${replacedBody}
    }
  );
`;
    finalHandlers.push(blockText);
  }

  fs.writeFileSync('migrated_tools.ts', finalHandlers.join('\\n\\n'), 'utf8');
}

main().catch(console.error);
