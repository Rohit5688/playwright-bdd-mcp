
  server.tool(
    "workflow_guide",
    "WHEN TO USE: Call this tool immediately when the USER asks you to start a complex, multi-step task like 'setup a new project', 'migrate a test', or 'build a test suite'. WHAT IT DOES: Returns the official LLM Operating System blueprint containing deterministic, loop-free chains of tools required to accomplish major TestForge objectives. HOW IT WORKS: You provide the objective (e.g., 'scaffold', 'generate', 'migrate', 'heal', 'ci'), and it gives you the exact ordered array of tools you MUST call to succeed without entering infinite loops or missing required setup configuration.",
    z.object({
"objective": z.enum(["scaffold", "generate", "migrate", "heal", "ci"]).describe("The phase of automation you are trying to achieve.")
  }),
    async (args) => {
      {
        const { objective } = args as any;
        const workflows: Record<string, string> = {
          scaffold: "1. setup_project -> 2. manage_config (scaffold) -> 3. manage_env (scaffold) -> 4. manage_users (scaffold)",
          generate: "1. analyze_codebase (or execute_sandbox_code) -> 2. inspect_page_dom (optional) -> 3. generate_gherkin_pom_test_suite -> 4. validate_and_write (auto-tests internally)",
          migrate: "1. migrate_test -> 2. validate_and_write",
          heal: "1. run_playwright_test -> 2. inspect_page_dom -> 3. self_heal_test -> 4. validate_and_write",
          ci: "1. generate_ci_pipeline"
        };
        const blueprint = workflows[objective as string] || "Unknown objective. Use scaffold, generate, migrate, heal, or ci.";
        const response = JSON.stringify({
          action: "WORKFLOW_BLUEPRINT_RETRIEVED",
          objective,
          blueprint,
          hint: `Follow these steps exactly in order. Proceed immediately to step 1 of ${objective}.`
        }, null, 2);
        return { content: [{ type: "text", text: response }] };
      }
    }
  );
\n\n
  server.tool(
    "analyze_codebase",
    "WHEN TO USE: To scan existing codebase structure before generating code. WHAT IT DOES: Analyzes the codebase using AST. Only use this for very small projects (< 5 files). FOR LARGE PROJECTS, ALWAYS USE 'execute_sandbox_code' (Turbo Mode) instead. HOW IT WORKS: Provide projectRoot.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the automation project."),
"customWrapperPackage": z.string().describe("Optional package name or local path for base page objects.").optional()
  }),
    async (args) => {
      {
        const { projectRoot, customWrapperPackage } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const resolvedWrapper = customWrapperPackage || config.basePageClass;
        const analysis = await analyzer.analyze(projectRoot, resolvedWrapper);

        // Auto-heal the local workspace memory so generators never guess the wrong path
        try {
          config.dirs = {
            ...config.dirs,
            features: analysis.detectedPaths.featuresRoot,
            pages: analysis.detectedPaths.pagesRoot,
            stepDefinitions: analysis.detectedPaths.stepsRoot,
          };
          mcpConfig.write(projectRoot, config);
        } catch (e) {
          // Ignore write fails if config is in a read-only state or doesn't exist
        }

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

        analysisCache.set(projectRoot, analysis);
        return { content: [{ type: "text", text: sanitizeOutput(JSON.stringify(analysis, null, 2)) }] };
      }
    }
  );
\n\n
  server.tool(
    "generate_gherkin_pom_test_suite",
    "WHEN TO USE: To generate a standard Playwright BDD test suite. WHAT IT DOES: Generates feature files and POM instructions. HOW IT WORKS: Returns a rigid system instruction context to the client LLM, ensuring the chat completion generates the requested Playwright-BDD JSON structure based on previously analyzed context.",
    z.object({
"testDescription": z.string().describe("Plain English test intent."),
"projectRoot": z.string().describe("Absolute path to the automation project."),
"customWrapperPackage": z.string().optional(),
"baseUrl": z.string().optional()
  }),
    async (args) => {
      {
        const { testDescription, projectRoot, customWrapperPackage, baseUrl } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const resolvedWrapper = customWrapperPackage || config.basePageClass;

        if (!analysisCache.has(projectRoot)) {
          analysisCache.set(projectRoot, await analyzer.analyze(projectRoot, resolvedWrapper));
        }
        const lastAnalysisResult = analysisCache.get(projectRoot)!;

        try {
          config.dirs = {
            ...config.dirs,
            features: lastAnalysisResult.detectedPaths.featuresRoot,
            pages: lastAnalysisResult.detectedPaths.pagesRoot,
            stepDefinitions: lastAnalysisResult.detectedPaths.stepsRoot,
          };
          mcpConfig.write(projectRoot, config);
        } catch (e) { }

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
    }
  );
\n\n
  server.tool(
    "run_playwright_test",
    "WHEN TO USE: AFTER generating or updating tests to verify they pass. WHAT IT DOES: Executes the Playwright-BDD test suite natively. HOW IT WORKS: It runs npm test or the specified command and returns the terminal output.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the automation project."),
"overrideCommand": z.string().describe("Optional full command to run (e.g. 'npm run test:e2e:smoke'). This bypasses the default executionCommand.").optional(),
"specificTestArgs": z.string().describe("Optional arguments like a specific feature file path or project flag.").optional(),
"tags": z.string().describe("Optional: filter by tag(s), e.g. '@smoke' or '@regression'. Passed as --grep to Playwright.").optional()
  }),
    async (args) => {
      {
        const { projectRoot, overrideCommand, specificTestArgs, tags } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const grepArg = tags ? `--grep "${tags}"` : '';
        const combinedArgs = [specificTestArgs, grepArg].filter(Boolean).join(' ');
        const activeCommand = overrideCommand || config.executionCommand;
        const result = await runner.runTests(projectRoot, combinedArgs || undefined, config.testRunTimeout, activeCommand);
        return { content: [{ type: "text", text: sanitizeOutput(result.output) }] };
      }
    }
  );
\n\n
  server.tool(
    "upgrade_project",
    "WHEN TO USE: To migrate or maintain older setups. WHAT IT DOES: Upgrades an existing Playwright-BDD project to support the latest MCP features (config, user stores, etc.). HOW IT WORKS: Safe and additive idempotent operation.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the project root")
  }),
    async (args) => {
      {
        const { projectRoot } = args as any;
        const upgradeResult = await maintenance.upgradeProject(projectRoot);
        return { content: [{ type: "text", text: `🚀 Project upgrade complete!\n\n${upgradeResult}` }] };
      }
    }
  );
\n\n
  server.tool(
    "inspect_page_dom",
    "WHEN TO USE: BEFORE generating Page Objects. WHAT IT DOES: Navigates to a target URL in a headless browser and returns the Accessibility Tree (semantic DOM). HOW IT WORKS: Extracts exact locators (names, roles, test ids) to ensure 100% accuracy.",
    z.object({
"url": z.string().describe("The full URL to inspect (e.g. http://localhost:3000/login)."),
"waitForSelector": z.string().describe("Optional selector to wait for before parsing, if page is slow to render.").optional(),
"storageState": z.string().describe("Optional absolute path to a Playwright storageState JSON file to bypass login.").optional(),
"includeIframes": z.boolean().describe("Set to true to also scrape accessibility trees inside nested iframes.").optional(),
"loginMacro": z.object({
"loginUrl": z.string(),
"userSelector": z.string(),
"usernameValue": z.string(),
"passSelector": z.string(),
"passwordValue": z.string(),
"submitSelector": z.string()
  }).describe("Optional macro to execute a login sequence BEFORE visiting the target URL. The AI can infer selectors for the login page and pass credentials here.").optional()
  }),
    async (args) => {
      {
        const { url, waitForSelector, storageState, includeIframes, loginMacro } = args as any;
        const domTree = await domInspector.inspect(url, waitForSelector, storageState, includeIframes, loginMacro);
        return { content: [{ type: "text", text: domTree }] };
      }
    }
  );
\n\n
  server.tool(
    "self_heal_test",
    "WHEN TO USE: After a run_playwright_test fails. WHAT IT DOES: Analyzes Playwright test failure output to determine if it's a SCRIPTING issue or an APPLICATION issue. HOW IT WORKS: Returns a targeted heal instruction telling the AI exactly which locator to fix and how to re-inspect the live DOM.",
    z.object({
"testOutput": z.string().describe("The raw terminal output from a failed npx playwright test or run_playwright_test run."),
"pageUrl": z.string().describe("Optional URL of the page being tested. If provided, the healer will call inspect_page_dom automatically to fetch fresh selectors.").optional()
  }),
    async (args) => {
      {
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
    }
  );
\n\n
  server.tool(
    "validate_and_write",
    "WHEN TO USE: After generating code content in memory. WHAT IT DOES: Writes the AI-generated test files to disk, runs them, and attempts auto-healing up to 3 times on failure. HOW IT WORKS: You pass the structured files to write as an array.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the test project."),
"files": z.array(z.object({
"path": z.string(),
"content": z.string()
  })).describe("Array of files to write. Each must have a 'path' (relative) and 'content' (string)."),
"jsonPageObjects": z.array(z.object({
"className": z.string(),
"path": z.string(),
"extendsClass": z.string().optional(),
"imports": z.array(z.string()).optional(),
"locators": z.array(z.object({})).optional(),
"methods": z.array(z.object({})).optional()
  })).describe("Optional structured JSON representations of Page Objects (bypasses raw TS formatting).").optional(),
"pageUrl": z.string().describe("Optional URL used to re-inspect the DOM during self-healing retries.").optional(),
"dryRun": z.boolean().describe("If true, audits and validates the files but skips writing to disk and testing. Returns a preview.").optional()
  }),
    async (args) => {
      {
        let { projectRoot, files, jsonPageObjects, pageUrl, dryRun } = args as any;
        const MAX_RETRIES = 3;
        // BUG-02 FIX: If a previous session was exhausted or interrupted, the map
        // entry could be stale (already at MAX_RETRIES). A fresh top-level invocation
        // should always start at attempt 1, not continue from a prior stale count.
        const existingCount = retrySessionMap.get(projectRoot) ?? 0;
        const currentAttempt = existingCount >= MAX_RETRIES ? 1 : existingCount + 1;
        retrySessionMap.set(projectRoot, currentAttempt);

        // Phase 4.2: JSON-Structured Code Generation
        // Transpile incoming JSON POMs and inject them into standard files array
        if (jsonPageObjects && Array.isArray(jsonPageObjects)) {
          for (const jsonPom of jsonPageObjects as JsonPageObject[]) {
            if (jsonPom.className && jsonPom.path) {
              const generatedContent = JsonToPomTranspiler.transpile(jsonPom);
              files.push({
                path: jsonPom.path,
                content: generatedContent
              });
            }
          }
        }

        // Phase 4.1: AST "Laziness" Scanner (Zero-Trust Enforcement)
        try {
          for (const f of files) {
            ASTScrutinizer.scrutinize(f.content, f.path);
          }
        } catch (astError: any) {
          return {
            content: [{
              type: "text",
              text: astError.message || String(astError)
            }],
            isError: true
          };
        }

        // Preview Mode explicitly skips touching the file system
        if (dryRun) {
          const writeResult = fileWriter.writeFiles(projectRoot, files, true);
          const secretViolations = auditGeneratedCode(files);
          let previewMsg = `✅ DRY RUN SUCCESS\n\nProposed files validated and structurally sound (NOT written):\n${writeResult.written.map((f: string) => `  - ${f}`).join('\n')}`;
          if (secretViolations.length > 0) {
            previewMsg += `\n\n🔒 SECRET AUDIT WARNING:\n${secretViolations.join('\n')}`;
          }
          if (writeResult.warnings.length > 0) {
            previewMsg += `\n\n⚠️ PATH WARNINGS:\n${writeResult.warnings.join('\n')}`;
          }
          return { content: [{ type: "text", text: sanitizeOutput(previewMsg) }] };
        }

        let stagingDir: string | undefined;
        try {
          // File-State Race Guard (TASK-66)
          fileStateService.validateWriteState(projectRoot, files);

          // Phase 4.3: Atomic Staging (TASK-44)
          try {
            stagingDir = await stagingService.stageAndValidate(projectRoot, files);
          } catch (stagingError: any) {
            return {
              content: [{
                type: "text",
                text: stagingError.message || String(stagingError)
              }],
              isError: true
            };
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

          const runResult = await runner.runTests(projectRoot, targetArg, runConfig.testRunTimeout, runConfig.executionCommand);
          const lastOutput = runResult.output;

          if (runResult.passed) {
            retrySessionMap.delete(projectRoot);
            fileStateService.clearState(projectRoot);
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
        } finally {
          if (stagingDir) {
            stagingService.cleanup(stagingDir);
          }
        }
      }
    }
  );
\n\n
  server.tool(
    "manage_env",
    "WHEN TO USE: To discover existing keys or upsert new credentials. WHAT IT DOES: Reads, writes, or scaffolds the .env file. HOW IT WORKS: Pass action 'read', 'write', or 'scaffold'. Automatically manages .env.example",
    z.object({
"projectRoot": z.string().describe("Absolute path to the test project."),
"action": z.enum(["read", "write", "scaffold"]).describe("The operation to perform."),
"entries": z.array(z.object({
"key": z.string(),
"value": z.string()
  })).describe("For 'write' action: array of {key, value} env entries to upsert.").optional()
  }),
    async (args) => {
      {
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
    }
  );
\n\n
  server.tool(
    "setup_project",
    "WHEN TO USE: First time setting up a new TestForge environment. WHAT IT DOES: Bootstraps an empty directory into a fully configured Playwright-BDD project. HOW IT WORKS: Creates necessary structure, installs npm packages, and writes config files.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the new or empty project directory.")
  }),
    async (args) => {
      {
        const { projectRoot } = args as any;
        const result = await projectSetup.setup(projectRoot);
        const cfg = mcpConfig.scaffold(projectRoot);
        const userResults = userStore.scaffold(projectRoot, cfg.environments);
        const envCount = Object.values(userResults).reduce((acc: number, r: any) => acc + r.added.length, 0);
        const setupMsg = result.message +
          `\n\n✅ mcp-config.json scaffolded (edit to customise tags, browsers, timeouts, auth strategy)` +
          `\n✅ User stores created for environments: ${cfg.environments.join(', ')} (${envCount} roles each)` +
          `\n   Fill in passwords in test-data/users.{env}.json — those files are git-ignored for safety.`;
        const responseText = JSON.stringify({
          action: "PROJECT_SCAFFOLDED",
          output: setupMsg,
          hint: "Project is scaffolded. Proceed to 'manage_config' or 'manage_env' to customize."
        }, null, 2);
        return { content: [{ type: "text", text: responseText }] };
      }
    }
  );
\n\n
  server.tool(
    "repair_project",
    "WHEN TO USE: After an interrupted setup. WHAT IT DOES: Repair and restore missing baseline files safely. HOW IT WORKS: Generates files that are missing without overwriting existing ones.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the project root.")
  }),
    async (args) => {
      {
        const { projectRoot } = args as any;
        const repairResult = await maintenance.repairProject(projectRoot);
        return { content: [{ type: "text", text: repairResult }] };
      }
    }
  );
\n\n
  server.tool(
    "summarize_suite",
    "WHEN TO USE: To get an overview of the current test suite. WHAT IT DOES: Reads all .feature files and returns a plain-English summary. HOW IT WORKS: Provides tag breakdown and ready-to-run selective test commands.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the test project.")
  }),
    async (args) => {
      {
        const { projectRoot } = args as any;
        const report = suiteSummary.summarize(projectRoot);
        const responseText = JSON.stringify({
          action: "SUITE_SUMMARIZED",
          summary: report.plainEnglishSummary,
          hint: "Use 'run_playwright_test' with specificTestArgs to run any listed tests."
        }, null, 2);
        return { content: [{ type: "text", text: responseText }] };
      }
    }
  );
\n\n
  server.tool(
    "manage_config",
    "WHEN TO USE: To read, write, preview, or scaffold project configurations. WHAT IT DOES: Interacts with mcp-config.json. HOW IT WORKS: Pass the action and optional partial config. ACTIONS: 'read' returns raw on-disk content; 'write' deep-merges patch and updates file; 'preview' shows what 'write' would produce WITHOUT touching disk; 'scaffold' creates the file if missing.",
    z.object({
"projectRoot": z.string(),
"action": z.enum(["read", "write", "scaffold", "preview"]),
"config": z.object({}).describe("Partial McpConfig to merge in (for 'write'/'scaffold'/'preview'). Missing keys use defaults.").optional()
  }),
    async (args) => {
      {
        const { projectRoot, action, config: configPatch } = args as any;

        // TASK-12: 'read' returns raw on-disk content — no defaults injected.
        // Callers that need defaults should use the service's read() internally;
        // this action is for inspecting what the user actually stored.
        if (action === "read") {
          const raw = mcpConfig.readRaw(projectRoot);
          if (raw === null) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "no_config",
                  message: `mcp-config.json not found at ${projectRoot}. Run 'scaffold' to create it.`,
                  defaults: DEFAULT_CONFIG
                }, null, 2)
              }]
            };
          }
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "ok",
                source: "disk",
                lastWrittenAt: mcpConfig.lastWrittenAt?.toISOString() ?? "unknown (pre-session write)",
                config: raw
              }, null, 2)
            }]
          };
        }

        // TASK-12: 'preview' — computes merged result WITHOUT touching disk.
        if (action === "preview") {
          if (!configPatch) throw new Error("'preview' action requires a 'config' object.");
          const previewed = mcpConfig.preview(projectRoot, configPatch);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "preview",
                message: "This is a dry-run. No files were written.",
                wouldProduce: previewed
              }, null, 2)
            }]
          };
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
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "ok",
                lastWrittenAt: mcpConfig.lastWrittenAt?.toISOString(),
                config: updated
              }, null, 2)
            }]
          };
        }

        throw new Error(`Unknown manage_config action: ${action}. Valid values: read, write, preview, scaffold`);
      }
    }
  );
\n\n
  server.tool(
    "manage_users",
    "WHEN TO USE: Manage multi-environment test users. WHAT IT DOES: Modifies users.{env}.json. HOW IT WORKS: Replaces specific values for accounts.",
    z.object({
"projectRoot": z.string(),
"action": z.enum(["list", "add-role", "scaffold"]),
"environment": z.string().describe("Target environment (e.g. 'staging'). Defaults to currentEnvironment in mcp-config.json.").optional(),
"roles": z.array(z.string()).describe("Role names to add (for 'add-role'), e.g. ['admin', 'readonly'].").optional()
  }),
    async (args) => {
      {
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
    }
  );
\n\n
  server.tool(
    "migrate_test",
    "WHEN TO USE: To port legacy scripts. WHAT IT DOES: Translates legacy Java/Python/JS Selenium code into strict TypeScript Playwright-BDD. HOW IT WORKS: Returns a rigid system prompt back.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the automation project."),
"legacyCode": z.string().describe("The raw legacy Selenium code snippet or file content."),
"sourceDialect": z.enum(["java", "python", "javascript", "csharp", "auto"]).describe("The language/dialect of the legacy code.")
  }),
    async (args) => {
      {
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
    }
  );
\n\n
  server.tool(
    "suggest_refactorings",
    "WHEN TO USE: To keep the codebase clean. WHAT IT DOES: Analyzes the codebase to find duplicate step definitions and unused Page Object methods. HOW IT WORKS: Returns a structured JSON/Markdown plan for pruning and consolidating the test suite.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the automation project.")
  }),
    async (args) => {
      {
        const { projectRoot } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const analysis = await analyzer.analyze(projectRoot);
        const report = refactoringService.generateRefactoringSuggestions(analysis);

        return {
          content: [{ type: "text", text: sanitizeOutput(report) }]
        };
      }
    }
  );
\n\n
  server.tool(
    "generate_fixture",
    "WHEN TO USE: To mock backend or entity data. WHAT IT DOES: Generates strict system instructions to help the LLM create a Playwright test fixture. HOW IT WORKS: Returns a prompt to create a typed Faker.js data factory.",
    z.object({
"entityName": z.string().describe("Name of the entity being mocked (e.g., 'User', 'Product')."),
"schemaDefinition": z.string().describe("Text description, JSON schema, or TypeScript interface defining the fields of the entity.")
  }),
    async (args) => {
      {
        const { entityName, schemaDefinition } = args as any;
        const systemPrompt = fixtureDataService.generateFixturePrompt(entityName, schemaDefinition);
        return {
          content: [{ type: "text", text: systemPrompt }]
        };
      }
    }
  );
\n\n
  server.tool(
    "update_visual_baselines",
    "WHEN TO USE: To resolve visual regression failures. WHAT IT DOES: Executes the Playwright test suite with the --update-snapshots flag. HOW IT WORKS: Rebaselines any toHaveScreenshot image mismatches natively.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the automation project."),
"specificTestArgs": z.string().describe("Optional arguments like a specific feature file path or project flag.").optional(),
"tags": z.string().describe("Optional: filter by tag(s), e.g. '@smoke' or '@regression'. Passed as --grep to Playwright.").optional()
  }),
    async (args) => {
      {
        const { projectRoot, specificTestArgs, tags } = args as any;
        await maintenance.ensureUpToDate(projectRoot);
        const config = mcpConfig.read(projectRoot);
        const grepArg = tags ? `--grep "${tags}"` : '';
        const baselineArg = '--update-snapshots';
        const combinedArgs = [specificTestArgs, grepArg, baselineArg].filter(Boolean).join(' ');
        const result = await runner.runTests(projectRoot, combinedArgs, config.testRunTimeout, config.executionCommand);
        return { content: [{ type: "text", text: sanitizeOutput(result.output) }] };
      }
    }
  );
\n\n
  server.tool(
    "request_user_clarification",
    "WHEN TO USE: CRITICAL: Call this tool when you encounter an architectural ambiguity or missing requirement. WHAT IT DOES: Halts execution to prompt the human user with your question. HOW IT WORKS: Returns a strict SYSTEM HALT directive and waits for their answer.",
    z.object({
"question": z.string().describe("The exact question you want to ask the user."),
"options": z.array(z.string()).describe("Optional: a list of suggested choices to make it easier for the user to reply.").optional(),
"context": z.string().describe("A brief explanation of WHY you are blocked and need clarification.")
  }),
    async (args) => {
      {
        const { question, options, context } = args as any;
        // Route through Questioner.clarify() — throws ClarificationRequired which is
        // caught by the global handler below and serialised as structured JSON.
        // This is the canonical AppForge pattern: throw → catch → structured response.
        Questioner.clarify(question, context, options);
      }
    }
  );
\n\n
  server.tool(
    "train_on_example",
    "WHEN TO USE: After manually correcting an AI generation error. WHAT IT DOES: Injects custom team knowledge or learned coding fixes into the persistent MCP memory. HOW IT WORKS: Ensures the AI does not repeat the same scripting mistake in future generations.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the automation project."),
"issuePattern": z.string().describe("The recurring error or structural ambiguity (e.g., 'Locating shadow root elements on login page', 'Missing await on dynamic loader')."),
"solution": z.string().describe("The exact code snippet or strategy required to overcome the issue."),
"tags": z.array(z.string()).describe("Optional module or feature tags.").optional()
  }),
    async (args) => {
      {
        const { projectRoot, issuePattern, solution, tags } = args as any;
        const rule = learningService.learn(projectRoot, issuePattern, solution, tags || []);
        const responseText = `Successfully learned new rule!\nSaved to mcp-learning.json\nPattern: ${rule.pattern}\nSolution: ${rule.solution}`;
        return { content: [{ type: "text", text: sanitizeOutput(responseText) }] };
      }
    }
  );
\n\n
  server.tool(
    "generate_ci_pipeline",
    "WHEN TO USE: To finalize a project setup on Github/Gitlab. WHAT IT DOES: Generates a fully-configured CI/CD pipeline template. HOW IT WORKS: Writes directly to disk the standard CI yaml.",
    z.object({
"projectRoot": z.string().describe("Absolute path to the automation project."),
"provider": z.string().describe("The CI/CD provider: 'github', 'gitlab', or 'jenkins'."),
"runOnPush": z.boolean().describe("Whether to trigger the pipeline on git push/PR."),
"runOnSchedule": z.string().describe("Optional cron schedule (e.g., '0 0 * * *' for nightly).").optional(),
"nodeVersion": z.string().describe("Optional Node version (defaults to '20').").optional()
  }),
    async (args) => {
      {
        const { projectRoot, provider, runOnPush, runOnSchedule, nodeVersion } = args as any;
        const targetPath = pipelineService.generatePipeline(projectRoot, {
          provider,
          runOnPush,
          runOnSchedule,
          nodeVersion
        });
        return { content: [{ type: "text", text: `✅ Pipeline successfully generated at:\n  - ${targetPath}\n\nEnsure you push this file to your repository and setup branch protections if applicable.` }] };
      }
    }
  );
\n\n
  server.tool(
    "export_jira_bug",
    "WHEN TO USE: When a failed test needs tracking. WHAT IT DOES: Generates a Jira-formatted bug report from a failed Playwright test. HOW IT WORKS: Incorporates file paths to the Playwright Trace and Video recordings.",
    z.object({
"testName": z.string().describe("The name of the failing test."),
"rawError": z.string().describe("The Playwright error output.")
  }),
    async (args) => {
      {
        const { testName, rawError } = args as any;
        const bugReport = analyticsService.generateJiraBugPrompt(testName, rawError);
        return {
          content: [{ type: "text", text: bugReport }]
        };
      }
    }
  );
\n\n
  server.tool(
    "export_team_knowledge",
    "WHEN TO USE: To share the AI's internal knowledge base. WHAT IT DOES: Exports the mcp-learning.json brain into a human-readable Markdown file. HOW IT WORKS: Writes to a document so the team can review autonomously learned rules.",
    z.object({
"projectRoot": z.string()
  }),
    async (args) => {
      {
        const { projectRoot } = args as any;
        // Delegate to LearningService.exportToMarkdown() — single source of truth.
        const md = learningService.exportToMarkdown(projectRoot);
        const docsDir = path.join(projectRoot, 'docs');
        if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
        const filePath = path.join(docsDir, 'team-knowledge.md');
        fs.writeFileSync(filePath, md, 'utf8');
        return {
          content: [{
            type: "text",
            text: `✅ Team knowledge exported to ${filePath}.\nCommit this file to share learned rules with the team.`
          }]
        };
      }
    }
  );
\n\n
  server.tool(
    "analyze_coverage_gaps",
    "WHEN TO USE: After generating coverage reports to find specific test gaps. WHAT IT DOES: Analyzes istanbul/v8 LCOV coverage metrics to identify deeply untested branches. HOW IT WORKS: Returns strict LLM instructions to generate the missing Playwright-BDD features.",
    z.object({
"projectRoot": z.string()
  }),
    async (args) => {
      {
        const { projectRoot } = args as any;
        const systemPrompt = analyticsService.analyzeCoverageGaps(projectRoot);
        return {
          content: [{ type: "text", text: systemPrompt }]
        };
      }
    }
  );
\n\n
  server.tool(
    "start_session",
    "WHEN TO USE: Start of interactive or multi-step tasks. WHAT IT DOES: Starts a persistent Playwright browser session in the background. HOW IT WORKS: Avoids launching a new browser per action. Returns context.",
    z.object({
"headless": z.boolean().describe("Whether to hide the browser UI. Default: true (headless).").optional(),
"storageState": z.string().describe("Path to a storageState JSON (cookies/auth).").optional()
  }),
    async (args) => {
      {
        const result = await sessionService.startSession(args as any);
        const responseText = JSON.stringify({
          action: "SESSION_STARTED",
          status: "SUCCESS",
          details: result,
          hint: "Session is active. You can now use 'navigate_session' or 'verify_selector'."
        }, null, 2);
        return { content: [{ type: "text", text: responseText }] };
      }
    }
  );
\n\n
  server.tool(
    "end_session",
    "WHEN TO USE: To close an interactive context. WHAT IT DOES: Ends the persistent Playwright browser session. HOW IT WORKS: Cleans up the background browser context.",
    z.object({}),
    async (args) => {
      {
        const result = await sessionService.endSession();
        return { content: [{ type: "text", text: result }] };
      }
    }
  );
\n\n
  server.tool(
    "navigate_session",
    "WHEN TO USE: To re-route an active session context. WHAT IT DOES: Navigates the persistent session to a target URL. HOW IT WORKS: Invokes Playwright page.goto() live.",
    z.object({
"url": z.string().describe("The URL to navigate to.")
  }),
    async (args) => {
      {
        const { url } = args as any;
        const result = await sessionService.navigate(url);
        return { content: [{ type: "text", text: result }] };
      }
    }
  );
\n\n
  server.tool(
    "verify_selector",
    "WHEN TO USE: To proactively guarantee loactors before writing. WHAT IT DOES: TESTS a CSS/XPath selector LIVE in the persistent browser without running a full script. HOW IT WORKS: Ensures locators are valid, visible, and enabled prior to Page Object saving.",
    z.object({
"selector": z.string().describe("The raw generic selector (e.g. '.submit-btn' or '//button').")
  }),
    async (args) => {
      {
        const { selector } = args as any;
        const result = await sessionService.verifySelector(selector);
        return { content: [{ type: "text", text: result }] };
      }
    }
  );
\n\n
  server.tool(
    "execute_sandbox_code",
    "WHEN TO USE: FOR ALL RESEARCH AND ANALYSIS tasks (🚀 TURBO MODE RECOMMENDED). WHAT IT DOES: Execute a JavaScript snippet inside a secure V8 sandbox to analyze code, find existing steps, or inspect DOMs. HOW IT WORKS: The script has access to forge.api.* and returns only the filtered data you need.",
    z.object({
"script": z.string().describe("The JavaScript code to execute. Use `return` to send a value back. Use `await forge.api.*()` to call server services. Keep scripts focused and small."),
"timeoutMs": z.number().describe("Optional execution timeout in milliseconds. Default: 10000 (10s).").optional()
  }),
    async (args) => {
      {
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
          readFile: async (filePath: string, projectRoot?: string) => {
            const resolvedRoot = path.resolve(projectRoot || process.cwd());
            const resolvedFile = path.resolve(resolvedRoot, filePath);
            if (!resolvedFile.startsWith(resolvedRoot + path.sep) && resolvedFile !== resolvedRoot) {
              throw new Error(`[SECURITY] Path traversal blocked. "${filePath}" resolves outside projectRoot.`);
            }
            if (!fs.existsSync(resolvedFile)) return null;
            const content = FileGuard.readTextFileSafely(resolvedFile);
            fileStateService.recordRead(resolvedRoot, resolvedFile, content);
            return content;
          },
          getConfig: async (projectRoot: string) => {
            return mcpConfig.read(projectRoot);
          },
          summarizeSuite: async (projectRoot: string) => {
            return suiteSummary.summarize(projectRoot);
          },
          listFiles: async (dir: string, options?: { recursive?: boolean; glob?: string }, projectRoot?: string) => {
            const MAX_LIST_ITEMS = 5000;
            const resolvedRoot = projectRoot ? path.resolve(projectRoot) : process.cwd();
            const absDir = path.resolve(resolvedRoot, dir);
            
            if (!absDir.startsWith(resolvedRoot + path.sep) && absDir !== resolvedRoot) {
              throw new Error(`[SECURITY] Path traversal blocked. "${dir}" resolves outside projectRoot.`);
            }
            if (!fs.existsSync(absDir)) {
              throw new Error(`Directory not found: ${absDir}`);
            }

            const walk = (base: string, rel = ''): string[] => {
              const results: string[] = [];
              const entries = fs.readdirSync(base, { withFileTypes: true });
              for (const entry of entries) {
                const name = entry.name;
                const full = path.join(base, name);
                const relPath = rel ? path.join(rel, name) : name;
                const stat = fs.lstatSync(full);
                if (stat.isSymbolicLink()) continue;
                if (stat.isFile()) results.push(relPath);
                else if (stat.isDirectory() && options?.recursive) {
                  results.push(...walk(full, relPath));
                }
                if (results.length >= MAX_LIST_ITEMS) break;
              }
              return results;
            };

            let items = options?.recursive ? walk(absDir, '') : fs.readdirSync(absDir).filter(n => {
              try {
                const s = fs.lstatSync(path.join(absDir, n));
                return !s.isSymbolicLink();
              } catch { return false; }
            });

            if (options?.glob) {
              // Minimal glob matcher using regex to avoid adding external dependencies dynamically
              const globToRegex = (globPattern: string) => {
                const escaped = globPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
                const replaced = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
                return new RegExp(`^${replaced}$`);
              };
              const regex = globToRegex(options.glob);
              items = items.filter(item => regex.test(path.basename(item)));
            }
    
            return items.slice(0, MAX_LIST_ITEMS);
          },
          searchFiles: async (pattern: string, dir: string, options?: { filePattern?: string; projectRoot?: string }) => {
            const MAX_SEARCH_FILES = 1000;
            const MAX_SEARCH_RESULTS = 500;
            const MAX_PARSE_FILE_BYTES = 1024 * 1024; // 1MB

            const pRoot = options?.projectRoot ? path.resolve(options.projectRoot) : process.cwd();

            if (/(?:\([^)]*\+[^)]*\)\+)/.test(pattern) || pattern.length > 200) {
              throw new Error('Regex rejected: potential ReDoS');
            }

            let regex: RegExp;
            try {
              regex = new RegExp(pattern, 'g');
            } catch {
              throw new Error('Invalid regex pattern');
            }

            // A bit hacky but we call the localized listFiles directly
            const resolvedRoot = pRoot;
            const absDir = path.resolve(resolvedRoot, dir);
            if (!absDir.startsWith(resolvedRoot + path.sep) && absDir !== resolvedRoot) {
              throw new Error(`[SECURITY] Path traversal blocked.`);
            }

            const walk = (base: string, rel = ''): string[] => {
              const results: string[] = [];
              const entries = fs.readdirSync(base, { withFileTypes: true });
              for (const entry of entries) {
                const name = entry.name;
                const full = path.join(base, name);
                const relPath = rel ? path.join(rel, name) : name;
                if (fs.lstatSync(full).isSymbolicLink()) continue;
                if (fs.statSync(full).isFile()) results.push(relPath);
                else if (fs.statSync(full).isDirectory()) results.push(...walk(full, relPath));
                if (results.length >= MAX_SEARCH_FILES) break;
              }
              return results;
            };

            let files = walk(absDir, '');
            if (options?.filePattern) {
              const escaped = options.filePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
              const rx = new RegExp(`^${escaped}$`);
              files = files.filter(f => rx.test(path.basename(f)));
            }

            const hits: Array<{ file: string; line: number; text: string }> = [];
            let scanned = 0;

            for (const fileRel of files.slice(0, MAX_SEARCH_FILES)) {
              const fullPath = path.join(absDir, fileRel);
              try {
                const stats = fs.statSync(fullPath);
                if (stats.size > MAX_PARSE_FILE_BYTES) continue;
                const content = FileGuard.readTextFileSafely(fullPath);
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  const lineContent = lines[i];
                  if (lineContent !== undefined && regex.test(lineContent)) {
                    hits.push({ file: path.join(dir, fileRel), line: i + 1, text: lineContent });
                    regex.lastIndex = 0; 
                    if (hits.length >= MAX_SEARCH_RESULTS) break;
                  }
                }
                scanned++;
                if (hits.length >= MAX_SEARCH_RESULTS) break;
              } catch { }
              if (scanned >= MAX_SEARCH_FILES) break;
            }

            return hits.slice(0, MAX_SEARCH_RESULTS);
          },
          parseAST: async (filePath: string, options?: { extractSignatures?: boolean; projectRoot?: string }) => {
            const ts = await import('typescript').catch(() => null);
            if (!ts) throw new Error('typescript package not available');

            const MAX_PARSE_FILE_BYTES = 1024 * 1024; // 1MB
            const projectRoot = options?.projectRoot ? path.resolve(options.projectRoot) : process.cwd();

            const absPath = path.resolve(projectRoot, filePath);
            if (!absPath.startsWith(projectRoot + path.sep) && absPath !== projectRoot) {
              throw new Error(`[SECURITY] Path traversal blocked. "${filePath}" resolves outside projectRoot.`);
            }
            if (!fs.existsSync(absPath)) {
              throw new Error(`File not found: ${absPath}`);
            }
            const stats = fs.statSync(absPath);
            if (stats.size > MAX_PARSE_FILE_BYTES) {
              throw new Error(`File too large: ${absPath}`);
            }

            const content = FileGuard.readTextFileSafely(absPath);
            const sourceFile = ts.createSourceFile(absPath, content, ts.ScriptTarget.Latest, true);

            if (options?.extractSignatures) {
              const signatures: Array<{ name: string; type: string; signature: string }> = [];
              const visit = (node: any) => {
                if (ts.isFunctionDeclaration(node) && node.name) {
                  signatures.push({
                    name: node.name.text,
                    type: 'function',
                    signature: (node.getText ? node.getText() : '').split('{')[0]?.trim() || ''
                  });
                } else if (ts.isClassDeclaration(node) && node.name) {
                  signatures.push({
                    name: node.name.text,
                    type: 'class',
                    signature: `class ${node.name.text}`
                  });
                }
                ts.forEachChild(node, visit);
              };
              visit(sourceFile);
              return signatures;
            }

            return sourceFile;
          },
          getEnv: async (key: string) => {
            const SAFE_ENV_VARS = [
              'NODE_ENV',
              'CI',
              'GITHUB_ACTIONS',
              'BASE_URL',
              'PLATFORM'
            ];
            if (!SAFE_ENV_VARS.includes(key)) {
              throw new Error(`Environment variable "${key}" is not on the allowlist.`);
            }
            return process.env[key] ?? null;
          }
        };

        const sandboxResult = await executeSandbox(script, apiRegistry, { timeoutMs });

        if (sandboxResult.success) {
          const parts: string[] = [];

          if (sandboxResult.logs.length > 0) {
            parts.push(`[Sandbox Logs]\n${sandboxResult.logs.join('\n')}`);
          }

          if (sandboxResult.result != null) {
            parts.push(
              typeof sandboxResult.result === 'string'
                ? sandboxResult.result
                : JSON.stringify(sandboxResult.result, null, 2)
            );
          } else if (sandboxResult.logs.length === 0) {
            parts.push('⚠️ Sandbox executed successfully but returned no data. Ensure your script uses `return <value>` to send results back.');
          }

          parts.push(`\n⏱️ Executed in ${sandboxResult.durationMs}ms`);
          return { content: [{ type: "text", text: sanitizeOutput(parts.join('\n\n')) }] };
        } else {
          return {
            content: [{ type: "text", text: `❌ SANDBOX ERROR: ${sandboxResult.error}\n\nLogs:\n${sandboxResult.logs.join('\n')}\n\n⏱️ Failed after ${sandboxResult.durationMs}ms` }],
            isError: true,
          };
        }
      }
    }
  );
\n\n
  server.tool(
    "check_environment",
    "WHEN TO USE: Pre-flight check. WHAT IT DOES: Verifies Node.js version, Playwright installation, browsers, and configs. HOW IT WORKS: Returns the environment readiness state as structured JSON.",
    z.object({
"projectRoot": z.string(),
"baseUrl": z.string().describe("Optional URL to test reachability. If omitted, reads BASE_URL from .env").optional()
  }),
    async (args) => {
      {
        const { projectRoot, baseUrl } = args as any;
        const report = await envCheckService.check(projectRoot, baseUrl) as any;
        const failCount = report.failCount !== undefined ? report.failCount : 0;
        const warnCount = report.warnCount !== undefined ? report.warnCount : 0;
        const responseText = JSON.stringify({
          action: "ENVIRONMENT_CHECK_COMPLETED",
          summary: report.summary || String(report),
          ready: failCount === 0,
          statusCounts: { fail: failCount, warn: warnCount },
          hint: failCount === 0 ? "Environment is ready. Proceed to 'setup_project' or 'generate'." : "Environment issues detected. Check the summary."
        }, null, 2);
        return { content: [{ type: "text", text: responseText }] };
      }
    }
  );
\n\n
  server.tool(
    "audit_locators",
    "WHEN TO USE: To verify locator health across the project. WHAT IT DOES: Scans Page Objects and flags brittle strategies. HOW IT WORKS: Returns a Markdown health report.",
    z.object({
"projectRoot": z.string(),
"pagesRoot": z.string().describe("Relative path to the pages directory. Defaults to 'pages'").optional()
  }),
    async (args) => {
      {
        const { projectRoot, pagesRoot } = args as any;
        const report = await locatorAuditService.audit(projectRoot, pagesRoot);
        return { content: [{ type: "text", text: report.markdownReport }] };
      }
    }
  );
\n\n
  server.tool(
    "audit_utils",
    "WHEN TO USE: To check for missing Playwright API surface wrappers. WHAT IT DOES: Scans the utils layer to report missing helper methods. HOW IT WORKS: Custom-wrapper-aware, counts implemented actions.",
    z.object({
"projectRoot": z.string(),
"customWrapperPackage": z.string().describe("Optional: package name or path to a custom BasePage/wrapper. E.g. '@myorg/playwright-helpers'. Methods from this package are counted as already present.").optional()
  }),
    async (args) => {
      {
        const { projectRoot, customWrapperPackage } = args as any;
        const result = await utilAuditService.audit(projectRoot, customWrapperPackage);
        const lines = [
          `## 🔧 Playwright Utils Coverage Report`,
          `**Coverage**: ${result.coveragePercent}% (${result.present.length}/${result.present.length + result.missing.length} methods)`,
          result.customWrapperNote ? `\n${result.customWrapperNote}` : '',
          result.coveredByWrapper.length > 0
            ? `\n**Covered by custom wrapper**: ${result.coveredByWrapper.join(', ')}`
            : '',
          result.missing.length === 0
            ? '\n✅ All standard Playwright helper methods are implemented!'
            : `\n### Missing Methods (${result.missing.length}):\n` +
            result.missing.map(m => `- \`${m.suggestedUtilClass}.${m.method}()\` [${m.category}] — ${m.description}`).join('\n'),
          result.actionableSuggestions.length > 0
            ? `\n### Actionable Suggestions:\n${result.actionableSuggestions.join('\n')}`
            : ''
        ].filter(Boolean).join('\n');
        return { content: [{ type: "text", text: lines }] };
      }
    }
  );
