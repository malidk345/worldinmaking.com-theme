/**
 * Logger utility with production/development awareness
 * In production, only errors and warnings are logged
 */


const isDev = process.env.NODE_ENV === 'development';

const logger = {
    log: (...args: unknown[]) => {
        if (isDev) {
            console.log(...args);
        }
    },
    info: (...args: unknown[]) => {
        if (isDev) {
            console.info(...args);
        }
    },
    warn: (...args: unknown[]) => {
        console.warn(...args); // Always show warnings
    },
    error: (...args: unknown[]) => {
        console.error(...args); // Always show errors
    },
    debug: (...args: unknown[]) => {
        if (isDev) {
            console.debug(...args);
        }
    },
};

export default logger;
