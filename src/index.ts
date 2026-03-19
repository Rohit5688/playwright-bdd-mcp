import * as path from 'path';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Command } from "commander";
import express from "express";

import { CodebaseAnalyzerService } from "./services/CodebaseAnalyzerService.js";
import { TestGenerationService } from "./services/TestGenerationService.js";
import { TestRunnerService } from "./services/TestRunnerService.js";
import { DomInspectorService } from "./services/DomInspectorService.js";
import { SelfHealingService } from "./services/SelfHealingService.js";
import { FileWriterService } from "./services/FileWriterService.js";
import { EnvManagerService } from "./services/EnvManagerService.js";
import { ProjectSetupService } from "./services/ProjectSetupService.js";
import { SuiteSummaryService } from "./services/SuiteSummaryService.js";
import { McpConfigService } from "./services/McpConfigService.js";
import { UserStoreService } from "./services/UserStoreService.js";
import { ProjectMaintenanceService } from "./services/ProjectMaintenanceService.js";

// SOLID: Dependency Injection Root
const analyzer = new CodebaseAnalyzerService();
const generator = new TestGenerationService();
const runner = new TestRunnerService();
const domInspector = new DomInspectorService();
const selfHealer = new SelfHealingService();
const fileWriter = new FileWriterService();
const envManager = new EnvManagerService();
const projectSetup = new ProjectSetupService();
const suiteSummary = new SuiteSummaryService();
const mcpConfig = new McpConfigService();
const userStore = new UserStoreService();
const maintenance = new ProjectMaintenanceService();

const server = new Server(
  {
    name: "playwright-bdd-pom-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Memory cache for analysis to pass to generator
let lastAnalysisResult: any = null;

// --- 18C FIX: Server-side retry session tracking ---
// Tracks how many validate_and_write attempts have been made per project.
// Resets on success or exhaustion.
const retrySessionMap = new Map<string, number>();

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
            specificTestArgs: { type: "string", description: "Optional arguments like a specific feature file path or project flag." },
            tags: { type: "string", description: "Optional: filter by tag(s), e.g. '@smoke' or '@regression'. Passed as --grep to Playwright." }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "upgrade_project",
        description: "Upgrades an existing Playwright-BDD project to support the latest MCP features (config, user stores, etc.). Safe and additive.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the project root" }
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
      },
      {
        name: "manage_env",
        description: "Reads, writes, or scaffolds the .env file for a test project. Use 'read' to discover existing env keys before code generation. Use 'write' to upsert new keys (URL, credentials). Use 'scaffold' to create a starter .env with sensible BDD defaults. Automatically manages .env.example and .gitignore.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the test project." },
            action: { type: "string", enum: ["read", "write", "scaffold"], description: "The operation to perform." },
            entries: {
              type: "array",
              description: "For 'write' action: array of {key, value} env entries to upsert.",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  value: { type: "string" }
                },
                required: ["key", "value"]
              }
            }
          },
          required: ["projectRoot", "action"],
        },
      },
      {
        name: "setup_project",
        description: "Bootstraps a new or empty directory into a fully configured Playwright-BDD project. Creates features/, pages/, step-definitions/ structure, installs npm packages (@playwright/test, playwright-bdd, typescript, dotenv), writes playwright.config.ts, tsconfig.json, and scaffolds a .env file. Call this FIRST when a user starts a brand-new test project.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the new or empty project directory." }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "summarize_suite",
        description: "Reads all .feature files in the project and returns a plain-English summary of the test suite: feature names, scenario titles, tag breakdown (@smoke/@regression/@e2e counts), and ready-to-run selective test commands. Useful for stakeholder reports and coverage reviews.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the test project." }
          },
          required: ["projectRoot"],
        },
      },
      {
        name: "manage_config",
        description: "Reads, writes, or scaffolds the mcp-config.json for a test project. Controls team-level preferences: allowed tags, directory layout, env variable names, browser list, timeout, auth strategy, and environments. Call 'scaffold' once during setup, then 'write' to update settings.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string" },
            action: { type: "string", enum: ["read", "write", "scaffold"] },
            config: { type: "object", description: "Partial McpConfig to merge in (for 'write'/'scaffold'). Missing keys use defaults." }
          },
          required: ["projectRoot", "action"]
        }
      },
      {
        name: "manage_users",
        description: "Manages environment-specific user credential stores in test-data/users.{env}.json. Use 'scaffold' for first-time setup (creates admin/standard/readonly roles). Use 'add-role' to add new roles. Use 'list' to see existing roles. Also generates a typed user-helper.ts so Page Objects call getUser('admin') instead of process.env.USERNAME.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string" },
            action: { type: "string", enum: ["list", "add-role", "scaffold"] },
            environment: { type: "string", description: "Target environment (e.g. 'staging'). Defaults to currentEnvironment in mcp-config.json." },
            roles: { type: "array", items: { type: "string" }, description: "Role names to add (for 'add-role'), e.g. ['admin', 'readonly']." }
          },
          required: ["projectRoot", "action"]
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "analyze_codebase") {
    const { projectRoot, customWrapperPackage } = request.params.arguments as any;

    // Proactively maintenance/upgrade before analysis
    await maintenance.ensureUpToDate(projectRoot);

    const config = mcpConfig.read(projectRoot);
    const resolvedWrapper = customWrapperPackage || config.basePageClass;

    const analysis = await analyzer.analyze(projectRoot, resolvedWrapper);
    lastAnalysisResult = analysis; // store in memory for ensuing generator call

    // --- Phase 23: Inject mcp-config.json and user store context ---
    (analysis as any).mcpConfig = config;

    // Read available user roles for the current environment (to hint the LLM)
    const userStoreResult = userStore.read(projectRoot, config.currentEnvironment);
    if (userStoreResult.exists && userStoreResult.roles.length > 0) {
      (analysis as any).userRoles = {
        environment: config.currentEnvironment,
        roles: userStoreResult.roles,
        helperImport: `import { getUser } from '../test-data/user-helper.js';`
      };
    }
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
    const { testDescription, projectRoot, customWrapperPackage, baseUrl } = request.params.arguments as any;

    // Ensure project is safe/scaffolded before generation
    await maintenance.ensureUpToDate(projectRoot);

    const config = mcpConfig.read(projectRoot);
    const resolvedWrapper = customWrapperPackage || config.basePageClass;

    // Fallback if not analyzed yet
    if (!lastAnalysisResult) {
      lastAnalysisResult = await analyzer.analyze(projectRoot, resolvedWrapper);
    }

    const instruction = await generator.generatePromptInstruction(
      testDescription,
      projectRoot,
      lastAnalysisResult,
      resolvedWrapper,
      baseUrl
    );

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
    const { projectRoot, specificTestArgs, tags } = request.params.arguments as any;
    
    // Final check before execution
    await maintenance.ensureUpToDate(projectRoot);

    // 21B: Build grep arg from tags if provided
    const grepArg = tags ? `--grep "${tags}"` : '';
    const combinedArgs = [specificTestArgs, grepArg].filter(Boolean).join(' ');
    const result = await runner.runTests(projectRoot, combinedArgs || undefined);

    return {
      content: [
        {
          type: "text",
          text: result.output
        }
      ]
    };
  }

  if (request.params.name === "summarize_suite") {
    const { projectRoot } = request.params.arguments as any;
    const report = suiteSummary.summarize(projectRoot);
    return { content: [{ type: "text", text: report.plainEnglishSummary }] };
  }

  if (request.params.name === "inspect_page_dom") {
    const { url, waitForSelector, storageState, includeIframes, loginMacro } = request.params.arguments as any;

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
    const { testOutput, pageUrl } = request.params.arguments as any;

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
    const { projectRoot, files, pageUrl } = request.params.arguments as any;
    const MAX_RETRIES = 3;

    // 18C: Use server-side session counter instead of resetting per call
    const currentAttempt = (retrySessionMap.get(projectRoot) ?? 0) + 1;
    retrySessionMap.set(projectRoot, currentAttempt);

    // STEP 1: Write current file set to disk (includes 18B overwrite warnings)
    const writeResult = fileWriter.writeFiles(projectRoot, files);
    const writtenFiles = writeResult.written;
    const overwriteWarnings = writeResult.warnings;

    // STEP 2: Run the test suite
    const runResult = await runner.runTests(projectRoot);
    const lastOutput = runResult.output;

    const warningBlock = overwriteWarnings.length > 0
      ? `\n\n${overwriteWarnings.join('\n')}`
      : '';

    // STEP 3: If passed, reset counter and celebrate!
    if (runResult.passed) {
      retrySessionMap.delete(projectRoot);
      return {
        content: [{
          type: "text",
          text: `✅ SUCCESS on attempt ${currentAttempt}/${MAX_RETRIES}!${warningBlock}\n\nAll tests passed. Files written and validated:\n${writtenFiles.map((f: string) => `  - ${f}`).join('\n')}\n\nYou can now commit these files to your repository.`
        }]
      };
    }

    // STEP 4: Classify the failure
    const analysis = selfHealer.analyzeFailure(lastOutput);

    // If it can't be healed, reset counter and stop early
    if (!analysis.canAutoHeal) {
      retrySessionMap.delete(projectRoot);
      return {
        content: [{
          type: "text",
          text: `⚠️ AUTO-HEAL BLOCKED after attempt ${currentAttempt}/${MAX_RETRIES}\n\n${analysis.healInstruction}\n\nThe failure appears to be caused by the application returning unexpected data. A human needs to investigate.`
        }]
      };
    }

    // STEP 5: Build healing instruction with optional fresh DOM snapshot
    let healingContext = analysis.healInstruction;
    if (pageUrl) {
      try {
        const dom = await domInspector.inspect(pageUrl);
        healingContext += `\n\n--- FRESH DOM SNAPSHOT (Attempt ${currentAttempt}) ---\n${dom}`;
      } catch (e) {
        healingContext += `\n\n[DOM re-inspection failed: ${(e as Error).message}]`;
      }
    }

    // If retries remain, return fix instruction to LLM
    if (currentAttempt < MAX_RETRIES) {
      return {
        content: [{
          type: "text",
          text: `🔄 ATTEMPT ${currentAttempt}/${MAX_RETRIES} FAILED — SELF-HEALING ACTIVATED\n\n${healingContext}\n\n⚡ ACTION REQUIRED: Fix the listed files and call validate_and_write again. You have ${MAX_RETRIES - currentAttempt} retries remaining.`
        }]
      };
    }

    // Exhausted all retries — reset counter
    retrySessionMap.delete(projectRoot);
    return {
      content: [{
        type: "text",
        text: `❌ ALL ${MAX_RETRIES} ATTEMPTS EXHAUSTED\n\nDespite ${MAX_RETRIES} self-healing attempts, the tests are still failing.\n\n${selfHealer.analyzeFailure(lastOutput).healInstruction}\n\n📋 WHAT TO DO NEXT:\n  1. Open test-results/ for Playwright's HTML report.\n  2. Review the failing Page Object files.\n  3. Use the inspect_page_dom tool on the live URL to get fresh locators.\n  4. If the application changed, update expected values in your .feature file.\n\n🙏 Don't worry — the BDD structure is correct. Only the indicated locators/assertions need attention.`
      }]
    };
  }

  if (request.params.name === "setup_project") {
    const { projectRoot } = request.params.arguments as any;
    const result = await projectSetup.setup(projectRoot);
    // Phase 23: also scaffold mcp-config.json and user stores
    const cfg = mcpConfig.scaffold(projectRoot);
    const userResults = userStore.scaffold(projectRoot, cfg.environments);
    const envCount = Object.values(userResults).reduce((acc, r) => acc + r.added.length, 0);
    const setupMsg = result.message +
      `\n\n✅ mcp-config.json scaffolded (edit to customise tags, browsers, timeouts, auth strategy)` +
      `\n✅ User stores created for environments: ${cfg.environments.join(', ')} (${envCount} roles each)` +
      `\n   Fill in passwords in test-data/users.{env}.json — those files are git-ignored for safety.`;
    return { content: [{ type: "text", text: setupMsg }] };
  }

  if (request.params.name === "manage_env") {
    const { projectRoot, action, entries } = request.params.arguments as any;

    if (action === "read") {
      const result = envManager.read(projectRoot);
      const summary = result.exists
        ? `Found .env at ${result.envFilePath} with ${result.keys.length} key(s):\n${result.keys.map(k => `  - ${k}`).join('\n')}`
        : `No .env file found at ${result.envFilePath}. Run 'scaffold' to create one.`;
      return { content: [{ type: "text", text: summary }] };
    }

    if (action === "write") {
      if (!entries || !Array.isArray(entries)) {
        throw new Error("'write' action requires an 'entries' array of {key, value} objects.");
      }
      const result = envManager.write(projectRoot, entries);
      const lines = [
        `✅ .env updated at ${result.envFilePath}`,
        result.written.length > 0 ? `\nWritten:\n${result.written.map((k: string) => `  + ${k}`).join('\n')}` : '',
        result.skipped.length > 0 ? `\nSkipped (already set or secret placeholder):\n${result.skipped.map((k: string) => `  ~ ${k}`).join('\n')}` : '',
        `\n.env.example updated. Remember to commit .env.example but NOT .env.`,
      ];
      return { content: [{ type: "text", text: lines.filter(Boolean).join('') }] };
    }

    if (action === "scaffold") {
      const result = envManager.scaffold(projectRoot);
      return {
        content: [{
          type: "text",
          text: `✅ .env scaffolded at ${result.envFilePath}\n\nDefault keys written:\n${result.written.map((k: string) => `  + ${k}`).join('\n')}\n\nNext steps:\n  1. Open .env and replace \"***FILL_IN***\" values with real credentials.\n  2. Commit .env.example (already created) but never .env.\n  3. Use process.env.BASE_URL in your Page Objects to reference the base URL.`
        }]
      };
    }

    throw new Error(`Unknown manage_env action: ${action}. Valid values: read, write, scaffold`);
  }

  if (request.params.name === "upgrade_project") {
    const { projectRoot } = request.params.arguments as any;
    const maintenanceResults = await maintenance.ensureUpToDate(projectRoot);
    
    return {
      content: [{
        type: "text",
        text: `🚀 Project upgraded successfully!\n\n${maintenanceResults.join('\n')}`
      }]
    };
  }

  if (request.params.name === "manage_config") {
    const { projectRoot, action, config: configPatch } = request.params.arguments as any;

    if (action === "read") {
      const current = mcpConfig.read(projectRoot);
      return { content: [{ type: "text", text: JSON.stringify(current, null, 2) }] };
    }

    if (action === "scaffold") {
      const written = mcpConfig.scaffold(projectRoot, configPatch ?? {});
      return {
        content: [{
          type: "text", text:
            `✅ mcp-config.json scaffolded at ${projectRoot}/mcp-config.json\n` +
            `✅ mcp-config.example.json created (safe to commit).\n\n` +
            `Current configuration:\n${JSON.stringify(written, null, 2)}`
        }]
      };
    }

    if (action === "write") {
      if (!configPatch) throw new Error("'write' action requires a 'config' object.");
      const updated = mcpConfig.write(projectRoot, configPatch);
      return { content: [{ type: "text", text: `✅ mcp-config.json updated.\n\n${JSON.stringify(updated, null, 2)}` }] };
    }

    throw new Error(`Unknown manage_config action: ${action}`);
  }

  if (request.params.name === "manage_users") {
    const { projectRoot, action, roles } = request.params.arguments as any;
    const cfg = mcpConfig.read(projectRoot);
    const env = (request.params.arguments as any).environment ?? cfg.currentEnvironment;

    if (action === "list") {
      const storeResult = userStore.read(projectRoot, env);
      if (!storeResult.exists) {
        return { content: [{ type: "text", text: `No user store found for environment "${env}". Run 'scaffold' first.` }] };
      }
      const listLines = [
        `👥 Users for environment: ${env} (${storeResult.filePath})`,
        `   Roles: ${storeResult.roles.join(', ')}`,
        '',
        ...storeResult.roles.map(role => {
          const u = storeResult.users[role]!;
          const pwdStatus = u.password === '***FILL_IN***' ? '⚠️ NOT SET' : '✅ set';
          return `   • ${role}: ${u.username} — password: ${pwdStatus}`;
        })
      ];
      return { content: [{ type: "text", text: listLines.join('\n') }] };
    }

    if (action === "scaffold") {
      const results = userStore.scaffold(projectRoot, cfg.environments);
      const scaffoldLines = [`✅ User stores scaffolded for all environments: ${cfg.environments.join(', ')}`];
      for (const [e, r] of Object.entries(results)) {
        scaffoldLines.push(`   ${e}: added=${r.added.join(', ') || 'none'}, skipped=${r.skipped.join(', ') || 'none'}`);
      }
      scaffoldLines.push('', `📄 user-helper.ts generated in test-data/ — Page Objects can now call: getUser('admin')`);
      scaffoldLines.push(`⚠️  Fill in passwords in test-data/users.{env}.json — those files are already in .gitignore.`);
      return { content: [{ type: "text", text: scaffoldLines.join('\n') }] };
    }

    if (action === "add-role") {
      if (!roles || !Array.isArray(roles) || roles.length === 0) {
        throw new Error("'add-role' action requires a 'roles' array.");
      }
      const addResult = userStore.addRoles(projectRoot, env, roles);
      userStore.generateUserHelper(projectRoot, userStore.read(projectRoot, env).roles);
      const addLines = [
        `✅ Roles updated for environment: ${env}`,
        addResult.added.length > 0 ? `   Added: ${addResult.added.join(', ')}` : '',
        addResult.skipped.length > 0 ? `   Skipped (already exist): ${addResult.skipped.join(', ')}` : '',
        '',
        `⚠️  Open ${addResult.filePath} and replace ***FILL_IN*** values with real credentials.`,
      ].filter(Boolean);
      return { content: [{ type: "text", text: addLines.join('\n') }] };
    }

    throw new Error(`Unknown manage_users action: ${action}`);
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});
// CLI setup for Stdio vs SSE
const program = new Command();

program
  .name("mcp-playwright-bdd")
  .description("MCP server for Playwright-BDD POM generation");

program
  .command("setup")
  .description("Bootstrap a new Playwright-BDD project")
  .argument("<projectRoot>", "Absolute path to the project root")
  .action(async (projectRoot) => {
    const setup = new ProjectSetupService();
    const result = await setup.setup(path.resolve(projectRoot));
    console.log(result.message);
    process.exit(0);
  });

program
  .command("upgrade")
  .description("Upgrade an existing project to latest MCP features")
  .argument("<projectRoot>", "Absolute path to the project root")
  .action(async (projectRoot) => {
    const root = path.resolve(projectRoot);
    const cfg = mcpConfig.scaffold(root);
    userStore.scaffold(root, cfg.environments);
    
    // Regenerate user-helper with accurate roles, not tags
    const storeData = userStore.read(root, cfg.currentEnvironment);
    const roles = storeData.exists && storeData.roles.length > 0 ? storeData.roles : ['admin', 'standard', 'readonly'];
    userStore.generateUserHelper(root, roles);
    
    envManager.scaffoldMulti(root, cfg.environments);
    console.log(`🚀 Project upgraded to v${cfg.version} successfully!`);
    process.exit(0);
  });

program
  .command("serve", { isDefault: true })
  .description("Start the MCP server (Stdio or SSE)")
  .option("--port <number>", "Port to run SSE server on")
  .option("--host <string>", "Host to run SSE server on", "127.0.0.1")
  .action(async (options) => {
    await startServer(options);
  });

program.parse(process.argv);

async function startServer(options: any) {
  if (options.port) {
    // SSE Transport
    const app = express();
    let transport: SSEServerTransport;

    app.get("/sse", async (req, res) => {
      transport = new SSEServerTransport("/message", res);
      await server.connect(transport);
    });

    app.post("/message", async (req, res) => {
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("Transport not established");
      }
    });

    const port = parseInt(options.port, 10);
    app.listen(port, options.host, () => {
      console.log(`[playwright-bdd-pom-mcp] Remote SSE listening on http://${options.host}:${port}/sse`);
    });
  } else {
    // Stdio Transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Silent startup log, as stdio is in use
  }
}

// startServer is now called via the "serve" command's action handler
