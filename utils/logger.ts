/**
 * Logger utility with production/development awareness
 * In production, only errors and warnings are logged
 */
/* eslint-disable no-console */

const isDev = process.env.NODE_ENV === 'development';

const logger = {
    log: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        }
    },
    info: (...args: any[]) => {
        if (isDev) {
            console.info(...args);
        }
    },
    warn: (...args: any[]) => {
        console.warn(...args); // Always show warnings
    },
    error: (...args: any[]) => {
        console.error(...args); // Always show errors
    },
    debug: (...args: any[]) => {
        if (isDev) {
            console.debug(...args);
        }
    },
};

export default logger;
