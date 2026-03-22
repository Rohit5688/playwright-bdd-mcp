export type PipelineProvider = 'github' | 'gitlab' | 'jenkins';
export interface PipelineOptions {
    provider: PipelineProvider;
    runOnPush: boolean;
    runOnSchedule?: string;
    nodeVersion?: string;
}
export declare class PipelineService {
    /**
     * Generates a CI/CD pipeline template based on the chosen provider.
     */
    generatePipeline(projectRoot: string, options: PipelineOptions): string;
}
//# sourceMappingURL=PipelineService.d.ts.map