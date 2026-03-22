export interface ILearningRule {
    id: string;
    pattern: string;
    solution: string;
    tags: string[];
    timestamp: string;
}
export interface ILearningSchema {
    version: string;
    rules: ILearningRule[];
}
export declare class LearningService {
    /**
     * Defines the storage location for the autonomous learning brain inside the user's project.
     */
    private getStoragePath;
    /**
     * Reads existing knowledge from the project.
     */
    getKnowledge(projectRoot: string): ILearningSchema;
    /**
     * Learns a new pattern and persists it to the project's autonomous knowledge base.
     */
    learn(projectRoot: string, pattern: string, solution: string, tags?: string[]): ILearningRule;
    /**
     * Generates a rigid system instructions block containing the project's learned rules,
     * meant to be injected into the MCP's generation prompts (Migration, BDD scaffolding, etc).
     */
    getKnowledgePromptInjection(projectRoot: string, dynamicDirectives?: string[]): string;
}
//# sourceMappingURL=LearningService.d.ts.map