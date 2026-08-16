export type LogContext = Readonly<Record<string, boolean | number | string>>;

export interface Logger {
  error: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  return ` ${JSON.stringify(context)}`;
}

export const logger: Logger = {
  error(message, context) {
    console.error(`[GETRA] ${message}${formatContext(context)}`);
  },
  info(message, context) {
    console.info(`[GETRA] ${message}${formatContext(context)}`);
  },
};
