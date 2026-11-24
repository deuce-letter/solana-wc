import pino from 'pino';
const loggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }
    : {}),
};

export const logger = pino(loggerOptions);