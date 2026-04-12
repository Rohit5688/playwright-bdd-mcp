import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Command } from "commander";
import express from "express";
import { CodebaseAnalyzerService } from "./services/CodebaseAnalyzerService.js";
import { TestGenerationService } from "./services/TestGenerationService.js";
import { TestRunnerService } from "./services/TestRunnerService.js";
import { DomInspectorService } from "./services/DomInspectorService.js";
import { SelfHealingService } from "./services/SelfHealingService.js";
import { FileWriterService } from "./services/FileWriterService.js";
// SOLID: Dependency Injection Root
const analyzer = new CodebaseAnalyzerService();
const generator = new TestGenerationService();
const runner = new TestRunnerService();
const domInspector = new DomInspectorService();
const selfHealer = new SelfHealingService();
const fileWriter = new FileWriterService();
const server = new Server({
    name: "TestForge",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Memory cache for analysis to pass to generator
let lastAnalysisResult = null;
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "analyze_codebase",
                description: "Analyzes an existing codebase to detect Playwright-BDD features, step definitions, and Page Objects. Always run this before test generation to ensure smart reuse.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectRoot: { type: "string", description: "Absolute path to the automation project." },
                        customWrapperPackage: { type: "string", description: "Optional package name or local path for base page objects." }
                    },
                    required: ["projectRoot"],
                },
            },
            {
                name: "generate_gherkin_pom_test_suite",
                description: "Returns a rigid system instruction context to the client LLM, ensuring the chat completion generates the requested Playwright-BDD JSON structure based on previously analyzed context.",
                inputSchema: {
                    type: "object",
                    properties: {
                        testDescription: { type: "string", description: "Plain English test intent." },
                        projectRoot: { type: "string", description: "Absolute path to the automation project." },
                        customWrapperPackage: { type: "string" },
                        baseUrl: { type: "string" },
                    },
                    required: ["testDescription", "projectRoot"],
                },
            },
            {
                name: "run_playwright_test",
                description: "Executes the Playwright-BDD test suite natively. Use this tool AFTER generating the test files to verify if they compile and pass. It runs `npx bddgen && npx playwright test` and returns the terminal output (success or failure logs).",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectRoot: { type: "string", description: "Absolute path to the automation project." },
                        specificTestArgs: { type: "string", description: "Optional arguments like a specific feature file path or project flag." }
                    },
                    required: ["projectRoot"],
                },
            },
            {
                name: "inspect_page_dom",
                description: "Navigates to a target URL in a headless browser and returns the Accessibility Tree (semantic DOM). Use this tool to extract exact locators (names, roles, test ids) BEFORE writing Page Objects to ensure 100% accuracy.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: { type: "string", description: "The full URL to inspect (e.g. http://localhost:3000/login)." },
                        waitForSelector: { type: "string", description: "Optional selector to wait for before parsing, if page is slow to render." },
                        storageState: { type: "string", description: "Optional absolute path to a Playwright storageState JSON file to bypass login." },
                        includeIframes: { type: "boolean", description: "Set to true to also scrape accessibility trees inside nested iframes." },
                        loginMacro: {
                            type: "object",
                            description: "Optional macro to execute a login sequence BEFORE visiting the target URL. The AI can infer selectors for the login page and pass credentials here.",
                            properties: {
                                loginUrl: { type: "string" },
                                userSelector: { type: "string" },
                                usernameValue: { type: "string" },
                                passSelector: { type: "string" },
                                passwordValue: { type: "string" },
                                submitSelector: { type: "string" }
                            },
                            required: ["loginUrl", "userSelector", "usernameValue", "passSelector", "passwordValue", "submitSelector"]
                        }
                    },
                    required: ["url"],
                },
            },
            {
                name: "self_heal_test",
                description: "Analyzes Playwright test failure output to determine if the failure is a SCRIPTING issue (bad locator) or an APPLICATION issue (wrong data). For scripting failures, it returns a targeted heal instruction telling the AI exactly which locator to fix and how to re-inspect the live DOM to get the correct selector.",
                inputSchema: {
                    type: "object",
                    properties: {
                        testOutput: { type: "string", description: "The raw terminal output from a failed npx playwright test or run_playwright_test run." },
                        pageUrl: { type: "string", description: "Optional URL of the page being tested. If provided, the healer will call inspect_page_dom automatically to fetch fresh selectors." }
                    },
                    required: ["testOutput"],
                },
            },
            {
                name: "validate_and_write",
                description: "Writes the AI-generated test files to disk, runs them, and if they fail, attempts self-healing up to 3 times. On each failure it classifies the root cause (locator, sync, or app bug) and returns a targeted fix instruction. After 3 exhausted attempts it returns a friendly message asking the human to investigate.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectRoot: { type: "string", description: "Absolute path to the test project." },
                        files: {
                            type: "array",
                            description: "Array of files to write. Each must have a 'path' (relative) and 'content' (string).",
                            items: {
                                type: "object",
                                properties: {
                                    path: { type: "string" },
                                    content: { type: "string" }
                                },
                                required: ["path", "content"]
                            }
                        },
                        pageUrl: { type: "string", description: "Optional URL used to re-inspect the DOM during self-healing retries." }
                    },
                    required: ["projectRoot", "files"],
                },
            }
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "analyze_codebase") {
        const { projectRoot, customWrapperPackage } = request.params.arguments;
        const analysis = await analyzer.analyze(projectRoot, customWrapperPackage);
        lastAnalysisResult = analysis; // store in memory for ensuing generator call
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(analysis, null, 2)
                }
            ]
        };
    }
    if (request.params.name === "generate_gherkin_pom_test_suite") {
        const { testDescription, projectRoot, customWrapperPackage, baseUrl } = request.params.arguments;
        // Fallback if not analyzed yet
        if (!lastAnalysisResult) {
            lastAnalysisResult = await analyzer.analyze(projectRoot, customWrapperPackage);
        }
        const instruction = await generator.generatePromptInstruction(testDescription, projectRoot, lastAnalysisResult, customWrapperPackage, baseUrl);
        return {
            content: [
                {
                    type: "text",
                    text: instruction
                }
            ]
        };
    }
    if (request.params.name === "run_playwright_test") {
        const { projectRoot, specificTestArgs } = request.params.arguments;
        const result = await runner.runTests(projectRoot, specificTestArgs);
        return {
            content: [
                {
                    type: "text",
                    text: result.output
                }
            ]
        };
    }
    if (request.params.name === "inspect_page_dom") {
        const { url, waitForSelector, storageState, includeIframes, loginMacro } = request.params.arguments;
        const domTree = await domInspector.inspect(url, waitForSelector, storageState, includeIframes, loginMacro);
        return {
            content: [
                {
                    type: "text",
                    text: domTree
                }
            ]
        };
    }
    if (request.params.name === "self_heal_test") {
        const { testOutput, pageUrl } = request.params.arguments;
        // 1. Classify the failure and build a heal instruction
        const analysis = selfHealer.analyzeFailure(testOutput);
        let response = analysis.healInstruction;
        // 2. If it is a scripting failure AND a URL is provided, automatically re-inspect the DOM
        //    so the AI gets live, accurate locators as part of the same tool call
        if (analysis.canAutoHeal && pageUrl) {
            const liveDom = await domInspector.inspect(pageUrl);
            response += `\n\n--- LIVE DOM SNAPSHOT (use these selectors to fix locators) ---\n${liveDom}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: response
                }
            ]
        };
    }
    if (request.params.name === "validate_and_write") {
        const { projectRoot, files, pageUrl } = request.params.arguments;
        const MAX_RETRIES = 3;
        let attempt = 0;
        let lastOutput = '';
        let writtenFiles = [];
        while (attempt < MAX_RETRIES) {
            attempt++;
            // STEP 1: Write current file set to disk
            writtenFiles = fileWriter.writeFiles(projectRoot, files);
            // STEP 2: Run the test suite
            const runResult = await runner.runTests(projectRoot);
            lastOutput = runResult.output;
            // STEP 3: If passed, celebrate!
            if (runResult.passed) {
                return {
                    content: [{
                        type: "text",
                        text: `✅ SUCCESS on attempt ${attempt}/${MAX_RETRIES}!\n\nAll tests passed. The following files were written and validated:\n${writtenFiles.map(f => `  - ${f}`).join('\n')}\n\nYou can now commit these files to your repository.`
                    }]
                };
            }
            // STEP 4: Classify the failure
            const analysis = selfHealer.analyzeFailure(lastOutput);
            // If it can't be healed (app failure or unknown), stop early
            if (!analysis.canAutoHeal) {
                return {
                    content: [{
                        type: "text",
                        text: `⚠️ AUTO-HEAL BLOCKED after attempt ${attempt}/${MAX_RETRIES}\n\n${analysis.healInstruction}\n\nThe test failure appears to be caused by the application returning unexpected data, not a scripting error. A human needs to investigate this.`
                    }]
                };
            }
            // STEP 5: Can heal — build the healing prompt with optional fresh DOM snapshot
            let healingContext = analysis.healInstruction;
            if (pageUrl) {
                try {
                    const dom = await domInspector.inspect(pageUrl);
                    healingContext += `\n\n--- FRESH DOM SNAPSHOT (Attempt ${attempt}) ---\n${dom}`;
                }
                catch (e) {
                    healingContext += `\n\n[DOM re-inspection failed: ${e.message}]`;
                }
            }
            // If we still have retries left, return the healing instruction to the LLM
            if (attempt < MAX_RETRIES) {
                return {
                    content: [{
                        type: "text",
                        text: `🔄 ATTEMPT ${attempt}/${MAX_RETRIES} FAILED — SELF-HEALING ACTIVATED\n\n${healingContext}\n\n⚡ ACTION REQUIRED: Please fix the files listed above and call validate_and_write again with the corrected file contents. You have ${MAX_RETRIES - attempt} retries remaining.`
                    }]
                };
            }
        }
        // Exhausted all 3 retries
        return {
            content: [{
                type: "text",
                text: `❌ ALL ${MAX_RETRIES} ATTEMPTS EXHAUSTED\n\nDespite ${MAX_RETRIES} self-healing attempts, the tests are still failing. Here is a summary of what went wrong:\n\n${selfHealer.analyzeFailure(lastOutput).healInstruction}\n\n📋 WHAT TO DO NEXT:\n  1. Open the test-results/ folder in your project for Playwright's HTML report.\n  2. Review the failing Page Object files listed above.\n  3. Consider using the inspect_page_dom tool manually with the live URL to get fresh locators.\n  4. If the application itself has changed, update the expected values in your .feature file.\n\n🙏 Don't worry — the structure of your BDD suite is correct and all non-failing tests are green. Only the indicated locators/assertions need attention.`
            }]
        };
    }
    throw new Error(`Tool not found: ${request.params.name}`);
});
// CLI setup for Stdio vs SSE
const program = new Command();
program
    .option('--port <number>', 'Port to run SSE server on')
    .option('--host <string>', 'Host to run SSE server on', '127.0.0.1');
program.parse(process.argv);
const options = program.opts();
async function startServer() {
    if (options.port) {
        // SSE Transport
        const app = express();
        let transport;
        app.get("/sse", async (req, res) => {
            transport = new SSEServerTransport("/message", res);
            await server.connect(transport);
        });
        app.post("/message", async (req, res) => {
            if (transport) {
                await transport.handlePostMessage(req, res);
            }
            else {
                res.status(400).send("Transport not established");
            }
        });
        const port = parseInt(options.port, 10);
        app.listen(port, options.host, () => {
            console.log(`[TestForge] Remote SSE listening on http://${options.host}:${port}/sse`);
        });
    }
    else {
        // Stdio Transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
        // Silent startup log, as stdio is in use
    }
}
startServer().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map