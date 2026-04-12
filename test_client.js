import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"]
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  const tools = await client.listTools();
  console.log("Found tools:", tools.tools.length);
  for(const t of tools.tools.slice(0, 3)){
      console.log(t.name);
  }
  process.exit(0);
}

main().catch(console.error);
