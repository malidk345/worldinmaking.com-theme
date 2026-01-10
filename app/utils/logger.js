/**
 * Logger utility with production/development awareness
 * In production, only errors and warnings are logged
 */

const isDev = process.env.NODE_ENV === 'development';

const logger = {
    log: (...args) => {
        if (isDev) {
            console.log(...args);
        }
    },
    info: (...args) => {
        if (isDev) {
            console.info(...args);
        }
    },
    warn: (...args) => {
        console.warn(...args); // Always show warnings
    },
    error: (...args) => {
        console.error(...args); // Always show errors
    },
    debug: (...args) => {
        if (isDev) {
            console.debug(...args);
        }
    },
};

export default logger;
