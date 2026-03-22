# Test Generation & Refactoring

The core of this MCP server is generating syntactically perfect, web-first BDD suites.

## `analyze_codebase`
**(Automatically executed by the AI)**. Before the AI writes code, it uses this tool to read your existing Step Definitions, Page Objects, Payload files, and Framework APIs. It even detects unused POM methods and Duplicate Playwright installations!

## `generate_gherkin_pom_test_suite`
Creates the rigid contextual prompt instructing the LLM on exactly how to write your `.feature` scenarios and TypeScript Page Objects. It intelligently reuses existing steps found during the codebase analysis.

**Example Prompt to AI:**
> *"Write a test suite for the Checkout flow. The user should add a product, verify the cart total, and submit payment."*

## `validate_and_write`
Once the LLM drafts the code, this tool writes it to disk. 
**Dry Run Mode**: The AI can execute this tool with `dryRun: true`. This returns a rich Git-style Diff to the chat interface so the human can approve the code before it touches the file system.

**Example Prompt to AI:**
> *"Generate a test for the Login page, but do a dry run first so I can review the code."*

## `suggest_refactorings`
Analyzes your AST (Abstract Syntax Tree) to find **Duplicate Step Definitions** or **Unused Page Object Methods** that are bloating your repository.

**Example Prompt to AI:**
> *"Run an analysis on my project and suggest refactorings to remove duplicate code."*

## `generate_fixture`
Connects to Faker.js to dynamically generate mock data payloads matching your entity definitions.

**Example Prompt to AI:**
> *"Generate a fixture payload for a 'CustomerProfile' entity. It needs a realistic email, phone number, and a nested address object. Save it to `test-data/customer.json`."*
