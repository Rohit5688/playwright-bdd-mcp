import { McpError, McpErrorCode } from "../types/ErrorSystem.js";

type Factory<T> = (container: ServiceContainer) => T;

export class ServiceContainer {
  private factories: Map<string, Factory<any>> = new Map();
  private instances: Map<string, any> = new Map();
  private resolving: Set<string> = new Set();

  register<T>(name: string, factory: Factory<T>): void {
    this.factories.set(name, factory);
  }

  resolve<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new McpError(
        `Service not registered: ${name}`,
        McpErrorCode.PROJECT_VALIDATION_FAILED
      );
    }

    if (this.resolving.has(name)) {
      throw new McpError(
        `Circular dependency detected: ${Array.from(this.resolving).join(" -> ")} -> ${name}`,
        McpErrorCode.PROJECT_VALIDATION_FAILED
      );
    }

    this.resolving.add(name);
    try {
      const instance = factory(this);
      this.instances.set(name, instance);
      return instance;
    } finally {
      this.resolving.delete(name);
    }
  }

  /** Clears all cached singletons. Use for testing or deep resets. */
  reset(): void {
    this.instances.clear();
  }
}

export const container = new ServiceContainer();
