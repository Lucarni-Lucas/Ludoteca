type LogContext = Readonly<Record<string, unknown>>;

function describeError(error: unknown): unknown {
  return error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
}

function withDescribedError(context: LogContext): LogContext {
  return "error" in context ? { ...context, error: describeError(context.error) } : context;
}

export const logger = {
  info(message: string, context: LogContext = {}): void {
    console.info(message, context);
  },
  warn(message: string, context: LogContext = {}): void {
    console.warn(message, withDescribedError(context));
  },
  error(message: string, context: LogContext = {}): void {
    console.error(message, withDescribedError(context));
  },
};
