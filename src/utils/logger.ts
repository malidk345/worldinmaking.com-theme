// Logger utility - conditionally logs based on environment
const isDev = process.env.NODE_ENV === 'development';

const logger = {
    log: (...args: unknown[]): void => {
        if (isDev) console.log(...args);
    },
    warn: (...args: unknown[]): void => {
        if (isDev) console.warn(...args);
    },
    error: (...args: unknown[]): void => {
        console.error(...args); // Always log errors
    },
    info: (...args: unknown[]): void => {
        if (isDev) console.info(...args);
    },
    debug: (...args: unknown[]): void => {
        if (isDev) console.debug(...args);
    }
};

export default logger;
