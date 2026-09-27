type LogContext = {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  storeId?: string;
  action?: string;
  status?: string;
  durationMs?: number;
  errorCode?: string;
};

function write(level: "info" | "warn" | "error", message: string, context: LogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.info(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
