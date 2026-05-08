type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = (process.env.NODE_ENV || "development") !== "production";

const format = (level: LogLevel, msg: string, meta?: Record<string, any>) => {
  const entry: any = {
    time: new Date().toISOString(),
    level,
    message: msg,
  };

  if (meta) entry.meta = meta;

  return JSON.stringify(entry);
};

export const logger = {
  debug: (msg: string, meta?: Record<string, any>) => {
    if (isDev) console.debug(format("debug", msg, meta));
  },
  info: (msg: string, meta?: Record<string, any>) => {
    console.log(format("info", msg, meta));
  },
  warn: (msg: string, meta?: Record<string, any>) => {
    console.warn(format("warn", msg, meta));
  },
  error: (msg: string, meta?: Record<string, any>) => {
    console.error(format("error", msg, meta));
  },
};

export default logger;
