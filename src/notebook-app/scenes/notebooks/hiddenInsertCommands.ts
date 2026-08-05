/**
 * WorldInMaking notebooks are writing / research tools — not PostHog analytics.
 * Hide Insight, Data, and SQL insert-menu entries (slash menu + built-ins).
 */
import { QUERY_SQL_INSERT_COMMAND_KEY } from '../../lib/components/MarkdownNotebook/InsertMenu'

/** Keys passed to MarkdownNotebook `hiddenInsertCommandKeys`. */
export const WIM_HIDDEN_INSERT_COMMAND_KEYS: string[] = [
    // Insight (built-in query viz)
    'query-trend',
    'query-funnel',
    'query-retention',
    'query-paths',
    'query-stickiness',
    'query-lifecycle',
    // SQL
    QUERY_SQL_INSERT_COMMAND_KEY,
    'component-SQLV2',
    'component-DuckSQL',
    'component-HogQLSQL',
    'component-Query',
    // Data
    'query-events',
    'data-people',
    'data-session-recordings',
    'component-RecordingPlaylist',
    'component-Recording',
    'component-Person',
    'component-Group',
    'component-Cohort',
    'component-Map',
    'component-PersonFeed',
    'component-PersonProperties',
    'component-GroupProperties',
    // Scene extras that re-introduce analytics
    'query-saved-insight',
    'product-cohort',
]
