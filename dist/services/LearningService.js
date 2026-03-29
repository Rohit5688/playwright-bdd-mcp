import fs from 'fs';
import path from 'path';
export class LearningService {
    /**
     * Defines the storage location for the autonomous learning brain inside the user's project.
     */
    getStoragePath(projectRoot) {
        const dir = path.join(projectRoot, '.playwright-bdd-mcp');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return path.join(dir, 'mcp-learning.json');
    }
    /**
     * Reads existing knowledge from the project.
     */
    getKnowledge(projectRoot) {
        const storagePath = this.getStoragePath(projectRoot);
        if (!fs.existsSync(storagePath)) {
            return { version: '1.0.0', rules: [] };
        }
        try {
            return JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        }
        catch {
            return { version: '1.0.0', rules: [] };
        }
    }
    /**
     * Learns a new pattern and persists it to the project's autonomous knowledge base.
     */
    learn(projectRoot, pattern, solution, tags = []) {
        const knowledge = this.getKnowledge(projectRoot);
        // Prevent exact duplicates
        const existing = knowledge.rules.find(r => r.pattern === pattern && r.solution === solution);
        if (existing)
            return existing;
        const newRule = {
            id: `rule-${Date.now()}`,
            pattern,
            solution,
            tags,
            timestamp: new Date().toISOString()
        };
        knowledge.rules.push(newRule);
        fs.writeFileSync(this.getStoragePath(projectRoot), JSON.stringify(knowledge, null, 2), 'utf8');
        return newRule;
    }
    /**
     * Generates a rigid system instructions block containing the project's learned rules,
     * meant to be injected into the MCP's generation prompts (Migration, BDD scaffolding, etc).
     */
    getKnowledgePromptInjection(projectRoot, dynamicDirectives = []) {
        const knowledge = this.getKnowledge(projectRoot);
        if (knowledge.rules.length === 0 && dynamicDirectives.length === 0)
            return '';
        let prompt = `\n### 🧠 CUSTOM TEAM KNOWLEDGE & LEARNED FIXES\n`;
        prompt += `IMPORTANT: You MUST adhere to the following learned rules. These are prior human-in-the-loop corrections or team structural standards that override ordinary behavior.\n\n`;
        knowledge.rules.forEach((rule, idx) => {
            prompt += `**Rule ${idx + 1}**: When you encounter: "${rule.pattern}"\n`;
            prompt += `-> **Action/Solution**: ${rule.solution}\n`;
            if (rule.tags.length > 0)
                prompt += `(Tags: ${rule.tags.join(', ')})\n`;
            prompt += `\n`;
        });
        if (dynamicDirectives.length > 0) {
            prompt += `**Inline Codebase Directives (@mcp-learn)**:\n`;
            dynamicDirectives.forEach(d => {
                prompt += `- ${d}\n`;
            });
            prompt += `\n`;
        }
        return prompt;
    }
    /** Deletes a specific rule by ID. Returns true if found and removed. */
    forget(projectRoot, ruleId) {
        const knowledge = this.getKnowledge(projectRoot);
        const idx = knowledge.rules.findIndex(r => r.id === ruleId);
        if (idx === -1)
            return false;
        knowledge.rules.splice(idx, 1);
        fs.writeFileSync(this.getStoragePath(projectRoot), JSON.stringify(knowledge, null, 2), 'utf8');
        return true;
    }
    /**
     * Exports the learning brain as a human-readable Markdown document.
     * Called by the export_team_knowledge tool.
     */
    exportToMarkdown(projectRoot) {
        const knowledge = this.getKnowledge(projectRoot);
        if (knowledge.rules.length === 0) {
            return '# TestForge MCP — Team Knowledge Base\n\n_No rules learned yet. Use `train_on_example` to add patterns._\n';
        }
        let md = `# TestForge MCP — Team Knowledge Base\n\n`;
        md += `**Version**: ${knowledge.version}\n`;
        md += `**Total Rules**: ${knowledge.rules.length}\n\n`;
        md += `| # | Pattern | Solution | Tags | Learned |\n`;
        md += `|---|---------|----------|------|--------|\n`;
        knowledge.rules.forEach((rule, idx) => {
            md += `| ${idx + 1} | ${rule.pattern} | ${rule.solution} | ${rule.tags.join(', ')} | ${rule.timestamp.split('T')[0]} |\n`;
        });
        return md;
    }
}
//# sourceMappingURL=LearningService.js.map