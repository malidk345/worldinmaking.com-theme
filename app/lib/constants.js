/**
 * Application Constants
 * Centralized configuration values used throughout the application
 */

// ============================================
// LAYOUT CONSTANTS
// ============================================

/** Header height in pixels */
export const HEADER_HEIGHT = 38;

/** Standard margin/padding value in pixels */
export const MARGIN = 8;

/** Mobile breakpoint in pixels */
export const MOBILE_BREAKPOINT = 768;

/** Tablet breakpoint in pixels */
export const TABLET_BREAKPOINT = 1024;

// ============================================
// WINDOW SYSTEM
// ============================================

/** Default window width */
export const DEFAULT_WINDOW_WIDTH = 800;

/** Default window height */
export const DEFAULT_WINDOW_HEIGHT = 600;

/** Minimum window width */
export const MIN_WINDOW_WIDTH = 300;

/** Minimum window height */
export const MIN_WINDOW_HEIGHT = 200;

/** Base z-index for windows */
export const BASE_WINDOW_Z_INDEX = 10;

/** Maximum z-index for windows (to stay under modals) */
export const MAX_WINDOW_Z_INDEX = 80;

// ============================================
// SIDEBAR
// ============================================

/** Sidebar width CSS variable name */
export const SIDEBAR_WIDTH_VAR = '--project-navbar-width';

/** Sidebar z-index for backdrop */
export const SIDEBAR_BACKDROP_Z_INDEX = 90;

/** Sidebar z-index for panel */
export const SIDEBAR_PANEL_Z_INDEX = 100;

// ============================================
// VOTING SYSTEM
// ============================================

/** Maximum votes per user per post */
export const MAX_VOTES_PER_USER = 5;

// ============================================
// CACHE / SWR
// ============================================

/** Default cache deduplication interval in milliseconds */
export const DEFAULT_CACHE_DEDUP_INTERVAL = 60000; // 1 minute

/** Tab history limit */
export const TAB_HISTORY_LIMIT = 10;

// ============================================
// ANIMATION SPRINGS (PostHog-Style Snappy Physics)
// ============================================

/** Premium spring animation config - Snappier Pop-in */
export const PREMIUM_SPRING = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8,
    restDelta: 0.001
};

/** Layout transition spring config - Smooth Movement */
export const LAYOUT_SPRING = {
    type: 'spring',
    stiffness: 280,
    damping: 32,
    mass: 1
};

/** Drawer animation spring config */
export const DRAWER_SPRING = {
    type: 'spring',
    damping: 35,
    stiffness: 350
};

// ============================================
// API / DATA
// ============================================

/** Default posts per page for pagination */
export const POSTS_PER_PAGE = 10;

/** Maximum file upload size in bytes (5MB) */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

/** Allowed image types for uploads */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
    SUPABASE_NOT_CONFIGURED: 'Supabase not configured',
    LOGIN_REQUIRED: 'please login to continue',
    FETCH_FAILED: 'failed to fetch data',
    CREATE_FAILED: 'failed to create',
    UPDATE_FAILED: 'failed to update',
    DELETE_FAILED: 'failed to delete',
    NETWORK_ERROR: 'network error occurred',
};

// ============================================
// SUCCESS MESSAGES
// ============================================

export const SUCCESS_MESSAGES = {
    CREATED: 'created successfully',
    UPDATED: 'updated successfully',
    DELETED: 'deleted successfully',
    COPIED: 'copied to clipboard',
    SAVED: 'saved successfully',
};
