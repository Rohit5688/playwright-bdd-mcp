import * as fs from 'fs';
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
import { McpConfigService, DEFAULT_CONFIG } from './services/McpConfigService.js';
import { UserStoreService } from "./services/UserStoreService.js";
import { ProjectMaintenanceService } from "./services/ProjectMaintenanceService.js";
import { SeleniumMigrationService } from "./services/SeleniumMigrationService.js";
import { RefactoringService } from "./services/RefactoringService.js";
import { FixtureDataService } from "./services/FixtureDataService.js";
import { AnalyticsService } from "./services/AnalyticsService.js";
import { LearningService } from "./services/LearningService.js";
import { PipelineService } from "./services/PipelineService.js";
import { PlaywrightSessionService } from "./services/PlaywrightSessionService.js";
import type { CodebaseAnalysisResult } from "./interfaces/ICodebaseAnalyzer.js";
import { sanitizeOutput, auditGeneratedCode } from "./utils/SecurityUtils.js";
import { executeSandbox } from "./services/SandboxEngine.js";
import type { SandboxApiRegistry } from "./services/SandboxEngine.js";

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
const seleniumMigrator = new SeleniumMigrationService();
const refactoringService = new RefactoringService();
const fixtureDataService = new FixtureDataService();
const analyticsService = new AnalyticsService();
const learningService = new LearningService();
const pipelineService = new PipelineService();
const sessionService = new PlaywrightSessionService();

const server = new Server(
  {
    name: "TestForge",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Memory cache for analysis to pass to generator
let lastAnalysisResult: CodebaseAnalysisResult | null = null;

// --- 18C FIX: Server-side retry session tracking ---
// Tracks how many validate_and_write attempts have been made per project.
// Resets on success or exhaustion.
const retrySessionMap = new Map<string, number>();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_codebase",
        description: "⚠️ TOKEN-INTENSIVE (LEGACY): Analyzes the entire codebase. Only use this for very small projects (< 5 files). FOR LARGE PROJECTS, ALWAYS USE 'execute_sandbox_code' (Turbo Mode) instead to save up to 98% in tokens.",
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
            pageUrl: { type: "string", description: "Optional URL used to re-inspect the DOM during self-healing retries." },
            dryRun: { type: "boolean", description: "If true, audits and validates the files but skips writing to disk and testing. Returns a preview." }
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
      },
      {
        name: "migrate_from_selenium",
        description: "Returns a rigid system instruction context to the client LLM, ensuring the chat completion correctly translates legacy Java/Python/JS Selenium code into strict TypeScript Playwright-BDD code, automatically applying correct wait strategies, iframe scopes, and window handlers.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the automation project." },
            legacyCode: { type: "string", description: "The raw legacy Selenium code snippet or file content." },
            sourceDialect: { type: "string", enum: ["java", "python", "javascript", "csharp", "auto"], description: "The language/dialect of the legacy code." }
          },
          required: ["projectRoot", "legacyCode", "sourceDialect"]
        }
      },
      {
        name: "suggest_refactorings",
        description: "Analyzes the codebase to find duplicate step definitions and unused Page Object methods. Returns a structured JSON/Markdown plan for pruning and consolidating the test suite. Call this periodically during a session to keep the codebase clean.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the automation project." }
          },
          required: ["projectRoot"]
        }
      },
      {
        name: "generate_fixture",
        description: "Generates strict system instructions to help the LLM create a Playwright test fixture and a Faker.js data factory for typed mock data generation.",
        inputSchema: {
          type: "object",
          properties: {
            entityName: { type: "string", description: "Name of the entity being mocked (e.g., 'User', 'Product')." },
            schemaDefinition: { type: "string", description: "Text description, JSON schema, or TypeScript interface defining the fields of the entity." }
          },
          required: ["entityName", "schemaDefinition"]
        }
      },
      {
        name: "update_visual_baselines",
        description: "Executes the Playwright test suite with the --update-snapshots flag to rebaseline any visual regression failures (toHaveScreenshot).",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the automation project." },
            specificTestArgs: { type: "string", description: "Optional arguments like a specific feature file path or project flag." },
            tags: { type: "string", description: "Optional: filter by tag(s), e.g. '@smoke' or '@regression'. Passed as --grep to Playwright." }
          },
          required: ["projectRoot"]
        }
      },
      {
        name: "request_user_clarification",
        description: "CRITICAL: Call this tool when you encounter an architectural ambiguity or missing requirement that prevents you from confidently generating code. This returns a strict SYSTEM HALT directive forcing the AI Host Client to stop, prompt the human user with your question, and wait for their answer before continuing.",
        inputSchema: {
          type: "object",
          properties: {
            question: { type: "string", description: "The exact question you want to ask the user." },
            options: { type: "array", items: { type: "string" }, description: "Optional: a list of suggested choices to make it easier for the user to reply." },
            context: { type: "string", description: "A brief explanation of WHY you are blocked and need clarification." }
          },
          required: ["question", "context"]
        }
      },
      {
        name: "train_on_example",
        description: "Injects custom team knowledge or learned coding fixes into the persistent MCP memory. Use this whenever the user explicitly corrects a Playwright execution error, so the AI does not repeat the same scripting mistake in future generations.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the automation project." },
            issuePattern: { type: "string", description: "The recurring error or structural ambiguity (e.g., 'Locating shadow root elements on login page', 'Missing await on dynamic loader')." },
            solution: { type: "string", description: "The exact code snippet or strategy required to overcome the issue." },
            tags: { type: "array", items: { type: "string" }, description: "Optional module or feature tags." }
          },
          required: ["projectRoot", "issuePattern", "solution"]
        }
      },
      {
        name: "generate_ci_pipeline",
        description: "Generates a fully-configured CI/CD pipeline template (GitHub Actions, GitLab CI, or Jenkins) tailored for Playwright-BDD, including HTML report publishing.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string", description: "Absolute path to the automation project." },
            provider: { type: "string", description: "The CI/CD provider: 'github', 'gitlab', or 'jenkins'." },
            runOnPush: { type: "boolean", description: "Whether to trigger the pipeline on git push/PR." },
            runOnSchedule: { type: "string", description: "Optional cron schedule (e.g., '0 0 * * *' for nightly)." },
            nodeVersion: { type: "string", description: "Optional Node version (defaults to '20')." }
          },
          required: ["projectRoot", "provider", "runOnPush"]
        }
      },
      {
        name: "export_jira_bug",
        description: "Generates a Jira-formatted bug report from a failed Playwright test, including file paths to the Playwright Trace and Video recordings.",
        inputSchema: {
          type: "object",
          properties: {
            testName: { type: "string", description: "The name of the failing test." },
            rawError: { type: "string", description: "The Playwright error output." }
          },
          required: ["testName", "rawError"]
        }
      },
      {
        name: "export_team_knowledge",
        description: "Exports the AI's internal mcp-learning.json brain into a human-readable Markdown file so the engineering team can review the autonomously learned rules.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string" }
          },
          required: ["projectRoot"]
        }
      },
      {
        name: "analyze_coverage_gaps",
        description: "Analyzes istanbul/v8 LCOV coverage metrics to identify deeply untested branches, returning strict LLM instructions to generate the missing Playwright-BDD features.",
        inputSchema: {
          type: "object",
          properties: {
            projectRoot: { type: "string" }
          },
          required: ["projectRoot"]
        }
      },
      {
        name: "start_session",
        description: "Starts a persistent Playwright browser session in the background. Call this at the start of interactive or multi-step tasks to avoid launching a new browser per action.",
        inputSchema: {
          type: "object",
          properties: {
            headless: { type: "boolean", description: "Whether to hide the browser UI. Default: true (headless)." },
            storageState: { type: "string", description: "Path to a storageState JSON (cookies/auth)." }
          }
        }
      },
      {
        name: "end_session",
        description: "Ends the persistent Playwright browser session.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "navigate_session",
        description: "Navigates the persistent session to a target URL.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL to navigate to." }
          },
          required: ["url"]
        }
      },
      {
        name: "verify_selector",
        description: "TESTS a CSS/XPath selector LIVE in the persistent browser without running a full script. Use this to proactively guarantee your generated locators are valid, visible, and enabled before saving them to a Page Object.",
        inputSchema: {
          type: "object",
          properties: {
            selector: { type: "string", description: "The raw generic selector (e.g. '.submit-btn' or '//button')." }
          },
          required: ["selector"]
        }
      },
      {
        name: "execute_sandbox_code",
        description: "🚀 TURBO MODE (RECOMMENDED): Execute a JavaScript snippet inside a secure V8 sandbox to analyze code, find existing steps, or inspect DOMs. Use this tool FOR ALL RESEARCH AND ANALYSIS tasks to prevent token overflow. The script has access to `forge.api.*` and returns only the filtered data you need. Available APIs: forge.api.inspectDom(url), forge.api.analyzeCodebase(projectRoot), forge.api.runTests(projectRoot).",
        inputSchema: {
          type: "object",
          properties: {
            script: { type: "string", description: "The JavaScript code to execute. Use `return` to send a value back. Use `await forge.api.*()` to call server services. Keep scripts focused and small." },
            timeoutMs: { type: "number", description: "Optional execution timeout in milliseconds. Default: 10000 (10s)." }
          },
          required: ["script"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze_codebase": {
        const { projectRoot, customWrapperPackage } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const resolvedWrapper = customWrapperPackage || config.basePageClass;
        const analysis = await analyzer.analyze(projectRoot, resolvedWrapper);
        // Supplementary metadata for the LLM prompt
        analysis.mcpConfig = {
          version: config.version || '0.0.0',
          upgradeNeeded: (config.version || '0.0.0') < DEFAULT_CONFIG.version,
          allowedTags: config.tags,
          backgroundBlockThreshold: config.backgroundBlockThreshold,
          waitStrategy: config.waitStrategy,
          authStrategy: config.authStrategy
        };

        const userStoreResult = userStore.read(projectRoot, config.currentEnvironment);
        if (userStoreResult.exists && userStoreResult.roles.length > 0) {
          analysis.userRoles = {
            environment: config.currentEnvironment,
            roles: userStoreResult.roles,
            helperImport: `import { getUser } from '../test-data/user-helper.js';`
          };
        }

        lastAnalysisResult = analysis;
        return { content: [{ type: "text", text: sanitizeOutput(JSON.stringify(analysis, null, 2)) }] };
      }

      case "generate_gherkin_pom_test_suite": {
        const { testDescription, projectRoot, customWrapperPackage, baseUrl } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const resolvedWrapper = customWrapperPackage || config.basePageClass;

        if (!lastAnalysisResult) {
          lastAnalysisResult = await analyzer.analyze(projectRoot, resolvedWrapper);
        }

        const memoryPrompt = learningService.getKnowledgePromptInjection(projectRoot, lastAnalysisResult.mcpLearnDirectives);

        const instruction = await generator.generatePromptInstruction(
          testDescription,
          projectRoot,
          lastAnalysisResult,
          resolvedWrapper,
          baseUrl,
          memoryPrompt
        );

        return { content: [{ type: "text", text: instruction }] };
      }

      case "run_playwright_test": {
        const { projectRoot, specificTestArgs, tags } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const grepArg = tags ? `--grep "${tags}"` : '';
        const combinedArgs = [specificTestArgs, grepArg].filter(Boolean).join(' ');
        const result = await runner.runTests(projectRoot, combinedArgs || undefined, config.testRunTimeout);
        return { content: [{ type: "text", text: sanitizeOutput(result.output) }] };
      }

      case "update_visual_baselines": {
        const { projectRoot, specificTestArgs, tags } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const grepArg = tags ? `--grep "${tags}"` : '';
        const baselineArg = '--update-snapshots';
        const combinedArgs = [specificTestArgs, grepArg, baselineArg].filter(Boolean).join(' ');
        const result = await runner.runTests(projectRoot, combinedArgs, config.testRunTimeout);
        return { content: [{ type: "text", text: sanitizeOutput(result.output) }] };
      }

      case "summarize_suite": {
        const { projectRoot } = args as any;
        const report = suiteSummary.summarize(projectRoot);
        return { content: [{ type: "text", text: report.plainEnglishSummary }] };
      }

      case "inspect_page_dom": {
        const { url, waitForSelector, storageState, includeIframes, loginMacro } = args as any;
        const domTree = await domInspector.inspect(url, waitForSelector, storageState, includeIframes, loginMacro);
        return { content: [{ type: "text", text: domTree }] };
      }

      case "self_heal_test": {
        const { testOutput, pageUrl, projectRoot } = args as any;
        let memoryPrompt = '';
        if (projectRoot) {
          memoryPrompt = learningService.getKnowledgePromptInjection(projectRoot);
        }
        const analysis = selfHealer.analyzeFailure(testOutput, memoryPrompt);
        let response = analysis.healInstruction;
        if (analysis.canAutoHeal && pageUrl) {
          const liveDom = await domInspector.inspect(pageUrl);
          response += `\n\n--- LIVE DOM SNAPSHOT (use these selectors to fix locators) ---\n${liveDom}`;
        }
        return { content: [{ type: "text", text: sanitizeOutput(response) }] };
      }

      case "validate_and_write": {
        const { projectRoot, files, pageUrl, dryRun } = args as any;
        const MAX_RETRIES = 3;
        const currentAttempt = (retrySessionMap.get(projectRoot) ?? 0) + 1;
        retrySessionMap.set(projectRoot, currentAttempt);

        // Preview Mode explicitly skips touching the file system
        if (dryRun) {
           const writeResult = fileWriter.writeFiles(projectRoot, files, true);
           const secretViolations = auditGeneratedCode(files);
           let previewMsg = `✅ DRY RUN SUCCESS\n\nProposed files validated (NOT written):\n${writeResult.written.map((f: string) => `  - ${f}`).join('\n')}`;
           if (secretViolations.length > 0) {
             previewMsg += `\n\n🔒 SECRET AUDIT WARNING:\n${secretViolations.join('\n')}`;
           }
           if (writeResult.warnings.length > 0) {
             previewMsg += `\n\n⚠️ PATH WARNINGS:\n${writeResult.warnings.join('\n')}`;
           }
           return { content: [{ type: "text", text: sanitizeOutput(previewMsg) }] };
        }

        const writeResult = fileWriter.writeFiles(projectRoot, files, false);

        // Phase 35b: Audit generated code for hardcoded secrets before running tests
        const secretViolations = auditGeneratedCode(files);
        if (secretViolations.length > 0) {
          const warningBlock = [
            `🔒 SECRET AUDIT: ${secretViolations.length} hardcoded credential(s) found in generated code!`,
            '',
            ...secretViolations,
            '',
            'The files were written but contain hardcoded secrets that should be replaced.',
            'Please regenerate these files using process.env variables or getUser() helpers instead.'
          ].join('\n');
          // Return the warning but DON'T block — let the LLM see the issue and fix it
          return {
            content: [{ type: "text", text: sanitizeOutput(warningBlock) }],
            isError: true
          };
        }

        const runConfig = mcpConfig.read(projectRoot);
        
        // Scope the test run ONLY to the generated feature to save time and tokens
        let targetArg = undefined;
        const featureFile = files.find((f: any) => f.path.endsWith('.feature'));
        if (featureFile && featureFile.content) {
          const match = featureFile.content.match(/Feature:\s*(.+)/);
          if (match && match[1]) {
            targetArg = `--grep "${match[1].trim()}"`;
          }
        }

        const runResult = await runner.runTests(projectRoot, targetArg, runConfig.testRunTimeout);
        const lastOutput = runResult.output;

        if (runResult.passed) {
          retrySessionMap.delete(projectRoot);
          return {
            content: [{
              type: "text",
              text: sanitizeOutput(`✅ SUCCESS on attempt ${currentAttempt}/${MAX_RETRIES}!\n\nAll tests passed. Files written and validated:\n${writeResult.written.map((f: string) => `  - ${f}`).join('\n')}`)
            }]
          };
        }

        const analysis = selfHealer.analyzeFailure(lastOutput);
        if (!analysis.canAutoHeal) {
          retrySessionMap.delete(projectRoot);
          return { content: [{ type: "text", text: sanitizeOutput(`⚠️ AUTO-HEAL BLOCKED after attempt ${currentAttempt}/${MAX_RETRIES}\n\n${analysis.healInstruction}`) }] };
        }

        let healingContext = analysis.healInstruction;
        if (pageUrl) {
          try {
            const dom = await domInspector.inspect(pageUrl);
            healingContext += `\n\n--- FRESH DOM SNAPSHOT (Attempt ${currentAttempt}) ---\n${dom}`;
          } catch (e) {
            healingContext += `\n\n[DOM re-inspection failed: ${(e as Error).message}]`;
          }
        }

        if (currentAttempt < MAX_RETRIES) {
          return { content: [{ type: "text", text: sanitizeOutput(`🔄 ATTEMPT ${currentAttempt}/${MAX_RETRIES} FAILED — SELF-HEALING ACTIVATED\n\n${healingContext}`) }] };
        }

        retrySessionMap.delete(projectRoot);
        return { content: [{ type: "text", text: sanitizeOutput(`❌ ALL ${MAX_RETRIES} ATTEMPTS EXHAUSTED\n\n${selfHealer.analyzeFailure(lastOutput).healInstruction}`) }] };
      }

      case "setup_project": {
        const { projectRoot } = args as any;
        const result = await projectSetup.setup(projectRoot);
        const cfg = mcpConfig.scaffold(projectRoot);
        const userResults = userStore.scaffold(projectRoot, cfg.environments);
        const envCount = Object.values(userResults).reduce((acc, r) => acc + r.added.length, 0);
        const setupMsg = result.message +
          `\n\n✅ mcp-config.json scaffolded (edit to customise tags, browsers, timeouts, auth strategy)` +
          `\n✅ User stores created for environments: ${cfg.environments.join(', ')} (${envCount} roles each)` +
          `\n   Fill in passwords in test-data/users.{env}.json — those files are git-ignored for safety.`;
        return { content: [{ type: "text", text: setupMsg }] };
      }

      case "manage_env": {
        const { projectRoot, action, entries } = args as any;
        if (action === "read") {
          const result = envManager.read(projectRoot);
          const summary = result.exists
            ? `Found .env at ${result.envFilePath} with ${result.keys.length} key(s):\n${result.keys.map((k: string) => `  - ${k}`).join('\n')}`
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

      case "upgrade_project": {
        const { projectRoot } = args as any;
        const msgs = await maintenance.ensureUpToDate(projectRoot);
        return { content: [{ type: "text", text: `🚀 Project upgraded!\n\n${msgs.join('\n')}` }] };
      }

      case "manage_config": {
        const { projectRoot, action, config: configPatch } = args as any;
        if (action === "read") {
          const current = mcpConfig.read(projectRoot);
          return { content: [{ type: "text", text: JSON.stringify(current, null, 2) }] };
        }
        if (action === "scaffold") {
          const written = mcpConfig.scaffold(projectRoot, configPatch ?? {});
          return {
            content: [{
              type: "text",
              text: `✅ mcp-config.json scaffolded at ${projectRoot}/mcp-config.json\n` +
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
        throw new Error(`Unknown manage_config action: ${action}. Valid values: read, write, scaffold`);
      }

      case "manage_users": {
        const { projectRoot, action, roles } = args as any;
        const cfg = mcpConfig.read(projectRoot);
        const env = (args as any).environment ?? cfg.currentEnvironment;

        if (action === "list") {
          const storeResult = userStore.read(projectRoot, env);
          if (!storeResult.exists) {
            return { content: [{ type: "text", text: `No user store found for environment "${env}". Run 'scaffold' first.` }] };
          }
          const listLines = [
            `👥 Users for environment: ${env} (${storeResult.filePath})`,
            `   Roles: ${storeResult.roles.join(', ')}`,
            '',
            ...storeResult.roles.map((role: string) => {
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

        throw new Error(`Unknown manage_users action: ${action}. Valid values: list, add-role, scaffold`);
      }

      case "migrate_from_selenium": {
        const { projectRoot, legacyCode, sourceDialect } = args as any;
        const codebaseContext = await analyzer.analyze(projectRoot);
        const memoryPrompt = learningService.getKnowledgePromptInjection(projectRoot, codebaseContext.mcpLearnDirectives);
        const systemPrompt = seleniumMigrator.generateMigrationPrompt(projectRoot, legacyCode, sourceDialect, codebaseContext, memoryPrompt);
        
        return {
          content: [
            {
              type: "text",
              text: systemPrompt
            }
          ]
        };
      }

      case "suggest_refactorings": {
        const { projectRoot } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const analysis = await analyzer.analyze(projectRoot);
        const report = refactoringService.generateRefactoringSuggestions(analysis);
        
        return {
          content: [{ type: "text", text: sanitizeOutput(report) }]
        };
      }

      case "generate_fixture": {
        const { entityName, schemaDefinition } = args as any;
        const systemPrompt = fixtureDataService.generateFixturePrompt(entityName, schemaDefinition);
        return {
          content: [{ type: "text", text: systemPrompt }]
        };
      }

      case "generate_rca_prompt": {
        const { errorMessage } = args as any;
        const systemPrompt = analyticsService.generateRcaPrompt(errorMessage);
        return {
          content: [{ type: "text", text: systemPrompt }]
        };
      }

      case "analyze_coverage_gaps": {
        const { projectRoot } = args as any;
        const systemPrompt = analyticsService.analyzeCoverageGaps(projectRoot);
        return {
          content: [{ type: "text", text: systemPrompt }]
        };
      }

      case "export_jira_bug": {
        const { testName, rawError } = args as any;
        const bugReport = analyticsService.generateJiraBugPrompt(testName, rawError);
        return {
          content: [{ type: "text", text: bugReport }]
        };
      }

      case "start_session": {
        const result = await sessionService.startSession(args as any);
        return { content: [{ type: "text", text: result }] };
      }

      case "end_session": {
        const result = await sessionService.endSession();
        return { content: [{ type: "text", text: result }] };
      }

      case "navigate_session": {
        const { url } = args as any;
        const result = await sessionService.navigate(url);
        return { content: [{ type: "text", text: result }] };
      }

      case "verify_selector": {
        const { selector } = args as any;
        const result = await sessionService.verifySelector(selector);
        return { content: [{ type: "text", text: result }] };
      }

      case "request_user_clarification": {
        const { question, options, context } = args as any;
        let responseText = `🚨 SYSTEM HALT: CLARIFICATION REQUIRED 🚨\n\n`;
        responseText += `Reason for pausing: ${context}\n\n`;
        responseText += `SYSTEM INSTRUCTION TO AI CLIENT: You MUST STOP generating files or executing further commands. Present the following question directly to the human user, and wait for their explicit answer.\n\n`;
        responseText += `Q: **${question}**\n`;
        if (options && options.length > 0) {
          responseText += `Options:\n`;
          options.forEach((opt: string, idx: number) => {
            responseText += `  ${idx + 1}. ${opt}\n`;
          });
        }
        return { content: [{ type: "text", text: sanitizeOutput(responseText) }] };
      }

      case "train_on_example": {
        const { projectRoot, issuePattern, solution, tags } = args as any;
        const rule = learningService.learn(projectRoot, issuePattern, solution, tags || []);
        const responseText = `Successfully learned new rule!\nSaved to mcp-learning.json\nPattern: ${rule.pattern}\nSolution: ${rule.solution}`;
        return { content: [{ type: "text", text: sanitizeOutput(responseText) }] };
      }

      case "generate_ci_pipeline": {
        const { projectRoot, provider, runOnPush, runOnSchedule, nodeVersion } = args as any;
        const targetPath = pipelineService.generatePipeline(projectRoot, {
          provider,
          runOnPush,
          runOnSchedule,
          nodeVersion
        });
        return { content: [{ type: "text", text: `✅ Pipeline successfully generated at:\n  - ${targetPath}\n\nEnsure you push this file to your repository and setup branch protections if applicable.` }] };
      }

      case "export_jira_bug": {
        const { testName, rawError } = args as any;
        const report = `h2. Bug: Automated Test Failure - ${testName}

h3. Error Log
{code:java}
${rawError}
{code}

h3. Attachments Available Local to Runner
Please attach the following artifacts from the CI machine or your local \`test-results\` / \`playwright-report\` folder:
* *Trace File*: \`playwright-report/trace.zip\` (Upload to https://trace.playwright.dev to view)
* *Video Recording*: \`test-results/**/video.webm\`

h3. Next Steps
# Review the attached trace to see the DOM snapshot at the time of failure.
# If this is a scripting error, use the agent's \`self_heal_test\` tool to fix the page object.`;

        return { content: [{ type: "text", text: sanitizeOutput(report) }] };
      }

      case "export_team_knowledge": {
        const { projectRoot } = args as any;
        const brain = learningService.getKnowledge(projectRoot);
        const docsDir = path.join(projectRoot, 'docs');
        if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
        const filePath = path.join(docsDir, 'team-knowledge.md');
        
        let md = `# Autonomous AI QA Brain\n\nThis document was automatically generated from \`.playwright-bdd-mcp/mcp-learning.json\`. These are the custom rules the AI has learned from human corrections.\n\n`;
        brain.rules.forEach((r, idx) => {
          md += `## Rule ${idx + 1}: ${r.pattern}\n**Action**: ${r.solution}\n**Tags**: ${r.tags.join(', ')}\n**Learned On**: ${r.timestamp}\n\n`;
        });

        fs.writeFileSync(filePath, md, 'utf8');

        return { content: [{ type: "text", text: `✅ Team Knowledge successfully exported to ${filePath}.\nCommit this to your repository to share with the team!` }] };
      }

      case "execute_sandbox_code": {
        const { script, timeoutMs } = args as any;

        // Build the API registry — expose safe server services to the sandbox
        const apiRegistry: SandboxApiRegistry = {
          inspectDom: async (url: string) => {
            return await domInspector.inspect(url);
          },
          analyzeCodebase: async (projectRoot: string) => {
            return await analyzer.analyze(projectRoot);
          },
          runTests: async (projectRoot: string) => {
            const config = mcpConfig.read(projectRoot);
            return await runner.runTests(projectRoot, undefined, config.testRunTimeout);
          },
          readFile: async (filePath: string) => {
            if (!fs.existsSync(filePath)) return null;
            return fs.readFileSync(filePath, 'utf8');
          },
          getConfig: async (projectRoot: string) => {
            return mcpConfig.read(projectRoot);
          },
          summarizeSuite: async (projectRoot: string) => {
            return suiteSummary.summarize(projectRoot);
          },
        };

        const sandboxResult = await executeSandbox(script, apiRegistry, { timeoutMs });

        if (sandboxResult.success) {
          let responseText = '';
          if (sandboxResult.logs.length > 0) {
            responseText += `[Sandbox Logs]\n${sandboxResult.logs.join('\n')}\n\n`;
          }
          responseText += typeof sandboxResult.result === 'string'
            ? sandboxResult.result
            : JSON.stringify(sandboxResult.result, null, 2);
          responseText += `\n\n⏱️ Executed in ${sandboxResult.durationMs}ms`;
          return { content: [{ type: "text", text: sanitizeOutput(responseText) }] };
        } else {
          return {
            content: [{ type: "text", text: `❌ SANDBOX ERROR: ${sandboxResult.error}\n\nLogs:\n${sandboxResult.logs.join('\n')}` }],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [{
        type: "text",
        text: `❌ ERROR in tool "${name}": ${msg}\n\nPlease check your inputs or try again.`
      }],
      isError: true
    };
  }
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

async function startServer(options: { port?: string; host?: string }) {
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
    const host = options.host || "127.0.0.1";
    app.listen(port, host, () => {
      console.log(`[playwright-bdd-pom-mcp] Remote SSE listening on http://${host}:${port}/sse`);
    });
  } else {
    // Stdio Transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Silent startup log, as stdio is in use
  }
}

// startServer is now called via the "serve" command's action handler
