/** Minimal logger surface used by shared RabbitMQ helpers. */
export interface SharedLogger {
  info(msgOrObj: string | Record<string, unknown>, msg?: string): void;
  warn(msgOrObj: string | Record<string, unknown>, msg?: string): void;
  error(msgOrObj: string | Record<string, unknown>, msg?: string): void;
  debug(msgOrObj: string | Record<string, unknown>, msg?: string): void;
}

let logger: SharedLogger = {
  info: (a, b) => console.log(b ?? a),
  warn: (a, b) => console.warn(b ?? a),
  error: (a, b) => console.error(b ?? a),
  debug: () => undefined,
};

export function configureShared(options: { logger: SharedLogger }): void {
  logger = options.logger;
}

export function getSharedLogger(): SharedLogger {
  return logger;
}
