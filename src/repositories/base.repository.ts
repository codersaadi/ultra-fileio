import {
  FileRepositoryHooks,
  HookContext,
  HookFunction,
} from './file.repository.interface';

// ============================================================================
// BASE REPOSITORY WITH HOOK EXECUTION
// ============================================================================

/**
 * Base repository class that handles hook execution
 * All ORM-specific repositories should extend this
 */
export abstract class BaseFileRepository {
  public hooks: FileRepositoryHooks;

  constructor(hooks: FileRepositoryHooks = {}) {
    this.hooks = hooks;
  }

  /**
   * Execute a hook function safely
   */
  protected async executeHook(
    hook: HookFunction | undefined,
    context: HookContext
  ): Promise<void> {
    if (!hook) return;

    try {
      await hook(context);
    } catch (error) {
      console.error(`Hook execution error in ${context.operation}:`, error);
      // Don't throw - hooks should not break the main operation
      // But do notify the error hook if it exists
      if (this.hooks.onError && hook !== this.hooks.onError) {
        await this.executeHook(this.hooks.onError, {
          operation: 'hook_error',
          error: error as Error,
          metadata: { originalContext: context },
        });
      }
    }
  }

  /**
   * Execute interceptor if present
   */
  protected async executeInterceptor(
    context: HookContext
  ): Promise<HookContext> {
    if (!this.hooks.intercept) return context;

    try {
      return await this.hooks.intercept(context);
    } catch (error) {
      console.error('Interceptor execution error:', error);
      return context;
    }
  }

  /**
   * Wrap an operation with before/after hooks and interceptor
   */
  protected async wrapWithHooks<T>(
    operation: string,
    beforeHook: HookFunction | undefined,
    afterHook: HookFunction | undefined,
    operationFn: () => Promise<T>,
    data?: any
  ): Promise<T> {
    const startTime = Date.now();
    let context: HookContext = {
      operation,
      data,
      startTime,
      metadata: {},
    };

    try {
      // Execute interceptor (before phase)
      context = await this.executeInterceptor(context);

      // Execute before hook
      await this.executeHook(beforeHook, context);

      // Execute main operation
      const result = await operationFn();

      // Update context with result
      context.result = result;
      context.metadata!.duration = Date.now() - startTime;

      // Execute interceptor (after phase)
      context = await this.executeInterceptor(context);

      // Execute after hook
      await this.executeHook(afterHook, context);

      return result;
    } catch (error) {
      // Update context with error
      context.error = error as Error;
      context.metadata!.duration = Date.now() - startTime;

      // Execute error hook
      await this.executeHook(this.hooks.onError, context);

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Add a hook at runtime
   */
  public addHook<K extends keyof FileRepositoryHooks>(
    hookName: K,
    hookFn: NonNullable<FileRepositoryHooks[K]>
  ): void {
    this.hooks[hookName] = hookFn as FileRepositoryHooks[K];
  }

  /**
   * Remove a hook at runtime
   */
  public removeHook(hookName: keyof FileRepositoryHooks): void {
    delete this.hooks[hookName];
  }

  /**
   * Get all registered hooks
   */
  public getHooks(): FileRepositoryHooks {
    return { ...this.hooks };
  }
}
