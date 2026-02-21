/**
 * Utility functions for the application
 */

/**
 * Merge class names together
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
