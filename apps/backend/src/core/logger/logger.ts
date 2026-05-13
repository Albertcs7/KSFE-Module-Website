import "dotenv/config";
import fs from "fs";
import path from "path";
import winston from "winston";

type LogLevel = "error" | "warn" | "info" | "debug";
type LogMeta = Record<string, unknown>;

const isProduction = process.env.NODE_ENV === "production";
const logDir = path.resolve(process.cwd(), "logs");
const sensitiveKeyPattern = /(password|pass|pwd|secret|token|authorization|auth|jwt)/i;

const ensureLogDirectory = (): void => {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

const sanitizeValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (value && typeof value === "object") {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, entry]) => {
        accumulator[key] = sensitiveKeyPattern.test(key)
          ? "[REDACTED]"
          : sanitizeValue(entry, seen);
        return accumulator;
      },
      {}
    );
  }

  return value;
};

const sanitizeInfo = winston.format((info) => {
  const sanitizedInfo = info as Record<string, unknown>;

  for (const [key, value] of Object.entries(info)) {
    if (sensitiveKeyPattern.test(key)) {
      sanitizedInfo[key] = "[REDACTED]";
      continue;
    }

    sanitizedInfo[key] = sanitizeValue(value);
  }

  return info;
});

ensureLogDirectory();

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  sanitizeInfo(),
  winston.format.json()
);

const consoleFormat = isProduction
  ? jsonFormat
  : winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      sanitizeInfo(),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, meta, ...rest }) => {
        const messageText = typeof message === "string" ? message : JSON.stringify(message);
        const metaText = meta ? ` ${JSON.stringify(meta)}` : "";
        const restText = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";

        return `${timestamp} ${level}: ${messageText}${metaText}${restText}`;
      })
    );

const baseLogger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  levels: winston.config.npm.levels,
  exitOnError: false,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      level: "debug",
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: jsonFormat,
    }),
  ],
});

const logger = {
  debug: (message: string, meta?: LogMeta) => {
    baseLogger.log({ level: "debug", message, meta });
  },
  info: (message: string, meta?: LogMeta) => {
    baseLogger.log({ level: "info", message, meta });
  },
  warn: (message: string, meta?: LogMeta) => {
    baseLogger.log({ level: "warn", message, meta });
  },
  error: (message: string, meta?: LogMeta) => {
    baseLogger.log({ level: "error", message, meta });
  },
};

export { logger };
export type { LogLevel, LogMeta };

export default logger;
