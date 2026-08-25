
import clsx from 'clsx'
import {
    CSSProperties,
    DragEvent as ReactDragEvent,
    FocusEvent as ReactFocusEvent,
    FormEvent,
    Fragment,
    KeyboardEvent,
    MouseEvent as ReactMouseEvent,
    ReactNode,
    TouchEvent as ReactTouchEvent,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import { ArrowDown, ArrowUp } from 'lucide-react'
import {
    IconComment,
    IconCopy,
    IconDrag,
    IconEllipsis,
    IconPeople,
    IconSparkles,
    IconTrash,
    IconX,
} from '@posthog/icons'
import { LemonMenu } from '@posthog/lemon-ui'

import { useAppActions, useAppSettings, useAppWindows } from '../../../../context/App'
import { openNotebookWindow } from '../../../../lib/open-notebook-window'
import { getNotebooks } from '../../../scenes/notebooks/notebookStorage'
import { requestPhilosopherComment } from '../../../../lib/notebook-invite-client'
import { resolveInviteBot } from '../../../../lib/bots/notebook-invite'
import {
    EMPTY_ANNOTATIONS,
    NotebookAnnotationsContext,
    getAnnotationNotes,
    setAnnotationResolved,
    updateNoteInAnnotations,
    upsertAnnotation,
} from './annotations'
import {
    deleteNotebookAnnotation,
    notebookReadableText,
    replaceRefQuotedText,
    clampOverlayPosition,
} from './annotationPlacement'
import { actorToInlineNote, applyRefToRange } from './inlineNotes'
import { InlineNotePopover } from './InlineNotePopover'
import { InvitePhilosopherPicker } from './InvitePhilosopherPicker'
import { MentionPicker } from './MentionPicker'
import {
    filterMentionPeople,
    getMentionTokenAt,
    insertMentionMark,
    listMentionPeople,
    type MentionPerson,
} from './mentionPeople'
import { mergeNotebookMarkdownChanges } from './collaboration'
import {
    ComponentPanelCacheEntry,
    ComponentPanelVisibility,
    CANVAS_COMPONENT_PANEL_VISIBILITY,
    DEFAULT_COMPONENT_PANEL_VISIBILITY,
    getComponentPanelVisibility,
    getInsertedComponentPanelVisibility,
    shouldPersistComponentPanelProps,
    withPersistedComponentPanelProps,
} from './componentPanels'
import {
    MarkdownNotebookTextSurface,
    areNotebookDocumentsEqual,
    ensureEditableNotebookDocument,
    getInlineInsertMenuQuery,
    getSlashTokenAt,
    getInsertMenuFilterQuery,
    getMarkdownNotebookVisualGroups,
    getNotebookStringProp,
    getPromptSource,
    getSlashCommandQuery,
    collectSlashSplitNodes,
    mergeDetachedSlashMenuBack,
    slashMenuRestoreText,
    splitListItemAtSlashToken,
    splitTextBlockAtSlashToken,
    getTaskItemShortcut,
    getTextBlockShortcutReplacement,
    hasNotebookContent,
    getDiscussionCommentRefId,
    isBlankInsertMenuButtonRow,
    isDiscussionCommentNode,
    isGroupedBlockquoteNode,
    isPromptComponentNode,
    isTextBlockNode,
    isTextGroupNode,
    makeEmptyNotebookTitle,
    removeNotebookNodesWithRefCleanup,
    stripNotebookRefMarksFromNodes,
    mapRestoreSelectionThroughDocumentChange,
    rekeyNotebookNodes,
    setsEqual,
    textBlocksShareContinuationStyle,
    updateNotebookCodeBlockText,
    withoutLeadingEmptyTitleGroup,
    withPreservedGroupStart,
} from './documentModel'
import {
    getClosestEditableBlockElement,
    getCollapsedSelectionRange,
    getCollapsedSelectionRestoreRequest,
    getElementForNode,
    getElementLineHeight,
    getInlineEditableElementForSelection,
    getNormalizedSelectionBounds,
    getNotebookBlockElement,
    getSelectedCodeRanges,
    getSelectedComponentNodeIds,
    getSelectedInlineEditableElementOfType,
    getSelectedListItemRanges,
    getSelectedNotebookMarkdown,
    getSelectedTextRanges,
    getSelectionClientRect,
    getSelectionRange,
    isFormattingToolbarFocused,
    isNativeEditableElement,
    rangeIntersectsNode,
    restoreSelection,
    restoreTextSelectionRanges,
    scrollNotebookElementIntoView,
} from './domSelection'
import {
    FLOATING_TOOLBAR_ESTIMATED_HEIGHT,
    FLOATING_TOOLBAR_ESTIMATED_HEIGHT_NARROW,
    FLOATING_TOOLBAR_GAP,
    FLOATING_TOOLBAR_REVEAL_DELAY_MS,
    FloatingToolbarListItemRange,
    FloatingToolbarPointerAnchor,
    FloatingToolbarPosition,
    FloatingToolbarState,
    FloatingToolbarTextRange,
    INSERT_MENU_PLACEHOLDER,
    INVITE_PICKER_MAX_HEIGHT,
    INVITE_PICKER_MIN_HEIGHT,
    INVITE_PICKER_WIDTH,
    InsertCommand,
    InsertMenuPosition,
    InsertMenuSelectionDirection,
    InsertMenuState,
    MarkdownNotebookInsertMenuApi,
    NOTEBOOK_TITLE_PLACEHOLDER,
    RestoreSelectionRequest,
    RestoreTextRange,
    TableCellPosition,
    TextBlockStyle,
    TextSelectionPointerStartEvent,
    TextSelectionPointerState,
} from './editorTypes'
import {
    FormattingToolbar,
    getFloatingToolbarLinkHref,
    getSelectedBlockStyle,
    getSelectedBlocksQuoted,
} from './FormattingToolbar'
import { markNotebookNodeFreshlyInserted } from './freshlyInserted'
import {
    InlineMarkSelection,
    areInlineSelectionsFullyMarked,
    plainTextToInlineNodes,
    setInlineLinkMark,
    setInlineMark,
    setInlineRefMark,
    splitInlineNodesAt,
} from './inlineContent'
import {
    InsertBoundaryButton,
    getClosestInsertBoundaryIndex,
    isInsertBoundaryAvailable,
    isInsertBoundaryVisible,
} from './InsertBoundaryButton'
import {
    InsertMenu,
    buildInsertCommands,
    getClampedInsertMenuSelectedIndex,
    getFilteredInsertCommands,
    getInsertMenuOptionDomId,
    getInsertMenuPosition,
    getNextInsertMenuSelectedIndex,
    omitInsertCommands,
} from './InsertMenu'
import {
    deleteListItemSelectionRange,
    getListItemIndex,
    getListItemParagraphReplacement,
    getListItemRefKey,
    shiftListItemSubtreeDepth,
} from './listModel'
import {
    htmlElementToInlineNodes,
    inlineNodesToHtml,
    makeEmptyParagraph,
    makeListItemId,
    parseInlineMarkdown,
    parseMarkdownNotebook,
    sanitizeNotebookLinkHref,
    serializeMarkdownNotebook,
} from './markdown'
import { NOTEBOOK_AI_WRITING_PLACEHOLDER } from './notebookAI'
import { NotebookOperation } from './operations'
import { reconcileNotebookDocuments } from './reconcile'
import {
    getMarkdownNotebookComponentDefinition,
    getMarkdownNotebookDefaultRegistry,
    mergeMarkdownNotebookRegistries,
} from './registry'
import {
    MarkdownNotebookCaretPosition,
    RemoteCaretOverlay,
    RemoteNotebookCaret,
    getFocusedBlockCaretPosition,
    getMarkdownNotebookCaretPosition,
    mapRemoteCaretPositionThroughDocumentChange,
} from './remoteCarets'
import { renderNode } from './renderNode'
import {
    getTableCellAtPosition,
    getTableCellPositionFromElement,
    getTableCellPositions,
    getTableCellRefKey,
    getTableColumnCount,
    getTableEdgeCellPosition,
    makeEmptyTableRow,
    normalizeTableRow,
    tableCellPositionsEqual,
} from './tableModel'
import {
    NotebookBlockNode,
    NotebookCodeBlockNode,
    NotebookComponentBlockNode,
    NotebookDocument,
    NotebookInlineMark,
    NotebookInlineNode,
    NotebookListItem,
    NotebookMode,
    NotebookTableBlockNode,
    NotebookTextBlockNode,
    NotebookTextSelectionRange,
} from './types'
import { cloneNotebookNode, getInlineText, normalizeInlineNodes } from './utils'
import {
    CommitDocumentOptions,
    EMPTY_AI_WRITING_NODE_INDEX_SET,
    MAX_TRACKED_LOCAL_SNAPSHOTS,
    POINTER_INERT_LINK_CONTAINER_SELECTOR,
    buildBlockMoreMenuItems,
    canShowBlockMoreMenu,
    createDefaultAIConversationId,
    createNotebookRefId,
    getAIWritingPlaceholderNodeIds,
    getComponentNodeUpdateHistoryOperations,
    getLatestEmptyAIPromptNodeId,
    type BlockMoreMenuAction,
    type MarkdownNotebookAskAIRequest,
    type MarkdownNotebookProps,
    type RemoteCaretAnchor,
} from './notebookEditorModel'
import { applyPhilosopherInviteNotes } from './inviteApply'
import { planOpenAIPromptInsert } from './planAIPromptInsert'
import { useNotebookClipboard } from './useNotebookClipboard'
import { useNotebookKeyboard } from './useNotebookKeyboard'
import { useNotebookUndo } from './useNotebookUndo'

export type { MarkdownNotebookAskAIRequest, MarkdownNotebookProps } from './notebookEditorModel'

export function MarkdownNotebook(props: MarkdownNotebookProps): JSX.Element {
    return <MarkdownNotebookEditor {...props} />
}

function MarkdownNotebookEditor({
    value,
    onChange,
    onAskAI,
    isAskAIDisabled: isAIPromptSubmitDisabled = false,
    createAIConversationId = createDefaultAIConversationId,
    mode = 'edit',
    registry,
    extraInsertCommands,
    hiddenInsertCommandKeys,
    selectionAIActions,
    remoteValue,
    remoteVersion,
    deferRemoteValue = false,
    onConflict,
    onInteractionStateChange,
    remoteCarets,
    onCaretChange,
    initialInsertMenu,
    convertExternalDataTransferToNodes,
    focusAIPromptRequest,
    aiWritingNodeIndexes,
    allowViewModeFilters = false,
    placeholder = 'Type / to insert a block, or just start writing…',
    className,
    autoFocus = false,
    'data-attr': dataAttr = 'markdown-notebook',
}: MarkdownNotebookProps): JSX.Element {
    const mergedRegistry = useMemo(
        () => mergeMarkdownNotebookRegistries(getMarkdownNotebookDefaultRegistry(), registry),
        [registry]
    )
    const [document, setDocument] = useState<NotebookDocument>(() =>
        ensureEditableNotebookDocument(parseMarkdownNotebook(value))
    )
    const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbarState | null>(null)
    const [insertMenu, setInsertMenu] = useState<InsertMenuState | null>(null)
    const [insertMenuPosition, setInsertMenuPosition] = useState<InsertMenuPosition | null>(null)
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
    const [activeBoundaryIndex, setActiveBoundaryIndex] = useState<number | null>(null)
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null)
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
    const [dropBoundaryIndex, setDropBoundaryIndex] = useState<number | null>(null)
    const [isExternalDragOver, setIsExternalDragOver] = useState(false)
    /** Whether the in-flight drag started inside this editor (native text/link drags included). */
    const canvasDragOriginRef = useRef(false)
    const [selectedComponentNodeIds, setSelectedComponentNodeIds] = useState<Set<string>>(() => new Set())
    const [componentPanelCache, setComponentPanelCache] = useState<Record<string, ComponentPanelCacheEntry>>({})

    const { addWindow, updateWindow } = useAppActions()
    const { windows } = useAppWindows()
    const { isMobile } = useAppSettings()

    const handleMainClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        const target = (event.target as HTMLElement).closest('.MarkdownNotebook__wikilink') as HTMLElement | null
        if (target) {
            const wikiTarget = target.getAttribute('data-wikilink-target')
            if (wikiTarget) {
                event.preventDefault()
                event.stopPropagation()
                const all = getNotebooks()
                const found = all.find(
                    (nb) =>
                        nb.id === wikiTarget ||
                        (nb.title && nb.title.trim().toLowerCase() === wikiTarget.trim().toLowerCase())
                )
                if (found) {
                    openNotebookWindow({
                        notebookId: found.id,
                        notebookTitle: found.title,
                        windows,
                        isMobile,
                        addWindow,
                        updateWindow,
                    })
                }
            }
        }
    }, [windows, isMobile, addWindow, updateWindow])

    const insertMenuDomId = useId()
    const notebookRef = useRef<HTMLDivElement | null>(null)
    const mainRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLDivElement | null>(null)
    const documentRef = useRef(document)
    const blockRefs = useRef<Record<string, HTMLElement | null>>({})
    const listItemRefs = useRef<Record<string, HTMLElement | null>>({})
    const tableCellRefs = useRef<Record<string, HTMLElement | null>>({})
    const rootEditableInputHtmlByNodeIdRef = useRef<Record<string, string>>({})
    const blockDragNodeIdRef = useRef<string | null>(null)
    const isTextSelectionPointerActiveRef = useRef(false)
    const floatingToolbarRevealTimeoutRef = useRef<number | null>(null)
    const floatingToolbarRevealAfterRef = useRef(0)
    const textSelectionPointerStateRef = useRef<TextSelectionPointerState | null>(null)
    const floatingToolbarPointerAnchorRef = useRef<FloatingToolbarPointerAnchor | null>(null)
    const floatingToolbarPositionLockRef = useRef<FloatingToolbarPosition | null>(null)
    const focusNodeRef = useRef<string | null>(null)
    const restoreSelectionRef = useRef<RestoreSelectionRequest | null>(null)
    const aiSelectionReviewRef = useRef<{
        promptNodeId: string
        targetNodeId: string
        start: number
        originalText: string
        pendingText: string
        listItemIndex?: number
    } | null>(null)

    const getNotebookNumberProp = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value)
            return Number.isFinite(parsed) ? parsed : undefined
        }
        return undefined
    }

    const replaceInlineRangeInNode = (
        targetNodeId: string,
        start: number,
        end: number,
        replacement: string,
        listItemIndex?: number
    ): void => {
        updateNode(targetNodeId, (currentNode) => {
            const parsedReplacement = parseInlineMarkdown(replacement)
            if (isTextBlockNode(currentNode)) {
                const [before, rest] = splitInlineNodesAt(currentNode.children, start)
                const [, after] = splitInlineNodesAt(rest, Math.max(0, end - start))
                return {
                    ...currentNode,
                    children: normalizeInlineNodes([...before, ...parsedReplacement, ...after]),
                }
            }
            if (currentNode.type === 'list' && listItemIndex != null && currentNode.items[listItemIndex]) {
                return {
                    ...currentNode,
                    items: currentNode.items.map((item, index) => {
                        if (index !== listItemIndex) {
                            return item
                        }
                        const [before, rest] = splitInlineNodesAt(item.children, start)
                        const [, after] = splitInlineNodesAt(rest, Math.max(0, end - start))
                        return {
                            ...item,
                            children: normalizeInlineNodes([...before, ...parsedReplacement, ...after]),
                        }
                    }),
                }
            }
            return currentNode
        })
    }
    const lastSerializedValueRef = useRef(value)
    // Recent local serializations, oldest first. A remote update matching one of these is the
    // echo of our own save — already contained in the local state, so merging it back in would
    // duplicate the overlapping insertions.
    const localSnapshotsRef = useRef<string[]>([value])
    // The three-way merge base: the last server state local edits were derived from.
    const lastBaseValueRef = useRef(remoteValue ?? value)
    const lastRemoteValueRef = useRef(remoteValue)
    const pendingRemoteValueRef = useRef<string | null>(null)
    const remoteVersionRef = useRef(remoteVersion)
    remoteVersionRef.current = remoteVersion
    const remoteCaretAnchorsRef = useRef<Record<string, RemoteCaretAnchor>>({})
    const [adjustedRemoteCarets, setAdjustedRemoteCarets] = useState<RemoteNotebookCaret[] | undefined>(remoteCarets)
    const [inlineNotePopover, setInlineNotePopover] = useState<{
        nodeId: string
        refId: string
        by: string
        name: string
        avatar?: string
        text: string
        kind?: 'human' | 'bot'
        pending?: boolean
        draft?: boolean
        createdAt?: string
        intent?: import('./types').NotebookNoteIntent
        suggestion?: string
        scope?: 'span' | 'piece' | 'block'
        resolved?: boolean
        top: number
        left: number
    } | null>(null)
    const [mentionPicker, setMentionPicker] = useState<{
        nodeId: string
        start: number
        query: string
        listItemIndex?: number
    } | null>(null)
    const [invitePicker, setInvitePicker] = useState<{ nodeId: string } | null>(null)
    const [invitePickerPosition, setInvitePickerPosition] = useState<InsertMenuPosition | null>(null)
    const [blockMenuNodeId, setBlockMenuNodeId] = useState<string | null>(null)
    const [mobileActiveNodeId, setMobileActiveNodeId] = useState<string | null>(null)
    const [mobileBarAnchor, setMobileBarAnchor] = useState<{
        top: number
        left: number
        placement: 'above' | 'below'
    } | null>(null)
    const touchStartPosRef = useRef<{
        x: number
        y: number
        timer: ReturnType<typeof setTimeout> | null
        row: HTMLElement | null
    } | null>(null)
    const [inviteStatus, setInviteStatus] = useState<{ names: string[]; error?: string } | null>(null)
    const initialInsertMenuAppliedRef = useRef(false)
    const emptyNodeRef = useRef<NotebookTextBlockNode>(makeEmptyParagraph('initial-empty'))
    const initializedComponentPanelNodeIdsRef = useRef<Set<string> | null>(null)

    const setLocalComponentPanels = useCallback((nodeId: string, panels: ComponentPanelVisibility): void => {
        setComponentPanelCache((currentCache) => ({
            ...currentCache,
            [nodeId]: {
                ...currentCache[nodeId],
                current: panels,
            },
        }))
    }, [])

    const rememberComponentPanels = useCallback((nodeId: string, panels: ComponentPanelVisibility): void => {
        setComponentPanelCache((currentCache) => ({
            ...currentCache,
            [nodeId]: {
                ...currentCache[nodeId],
                remembered: panels,
            },
        }))
    }, [])

    const hasDiscussionComments = useMemo(() => document.nodes.some(isDiscussionCommentNode), [document])
    const aiWritingNodeIndexSet = useMemo(
        () => (aiWritingNodeIndexes?.length ? new Set(aiWritingNodeIndexes) : EMPTY_AI_WRITING_NODE_INDEX_SET),
        [aiWritingNodeIndexes]
    )

    const clearFloatingToolbarRevealTimeout = useCallback((): void => {
        if (floatingToolbarRevealTimeoutRef.current === null) {
            return
        }

        window.clearTimeout(floatingToolbarRevealTimeoutRef.current)
        floatingToolbarRevealTimeoutRef.current = null
    }, [])

    const mapRemoteCaretAnchors = useCallback(
        (previousDocument: NotebookDocument, nextDocument: NotebookDocument, remoteMergeVersion?: number): void => {
            const anchors = remoteCaretAnchorsRef.current
            const clientIds = Object.keys(anchors)
            if (!clientIds.length) {
                return
            }

            let didChange = false
            for (const clientIdKey of clientIds) {
                const anchor = anchors[clientIdKey]
                // A ping at or past the merged version already reflects the incoming change.
                if (
                    remoteMergeVersion !== undefined &&
                    anchor.caret.version !== undefined &&
                    anchor.caret.version >= remoteMergeVersion
                ) {
                    continue
                }
                const mapped = mapRemoteCaretPositionThroughDocumentChange(
                    anchor.position,
                    previousDocument,
                    nextDocument
                )
                if (mapped !== anchor.position) {
                    anchors[clientIdKey] = { ...anchor, position: mapped }
                    didChange = true
                }
            }
            if (didChange) {
                setAdjustedRemoteCarets(
                    Object.values(anchors).map((anchor) => ({ ...anchor.caret, position: anchor.position }))
                )
            }
        },
        []
    )

    const {
        rebaseHistoryThroughDocumentChange,
        pushHistoryEntry,
        undoHistory,
        redoHistory,
        bindCommitDocument,
    } = useNotebookUndo({
        documentRef,
        notebookElementRef: notebookRef,
        restoreSelectionRef,
    })

    useEffect(() => {
        if (value === lastSerializedValueRef.current) {
            return
        }

        const restoreSelectionRequest = notebookRef.current
            ? getCollapsedSelectionRestoreRequest(window.getSelection(), notebookRef.current)
            : null
        const previousDocument = documentRef.current
        const reconciledDocument = ensureEditableNotebookDocument(
            reconcileNotebookDocuments(previousDocument, parseMarkdownNotebook(value)).document
        )
        // An external value change (artifact apply, restore, AI edit) rebases the undo
        // history over the incoming operations instead of clearing it, so CMD+Z keeps
        // reverting only this user's edits.
        rebaseHistoryThroughDocumentChange(previousDocument, reconciledDocument)
        mapRemoteCaretAnchors(previousDocument, reconciledDocument)
        documentRef.current = reconciledDocument
        setDocument(reconciledDocument)
        if (restoreSelectionRequest) {
            // Map the caret through the incoming change so it stays at the same place in
            // the text, not at the same numeric offset.
            restoreSelectionRef.current = mapRestoreSelectionThroughDocumentChange(
                restoreSelectionRequest,
                previousDocument,
                reconciledDocument
            )
        }
        // The base is intentionally left untouched: an external `value` change is a local-side
        // update (artifact apply, restore), so the last synced server state remains the merge base.
        lastSerializedValueRef.current = value
        trackLocalSnapshot(value)
        // oxlint-disable-next-line exhaustive-deps
    }, [value])

    const clearMobileBlockBar = useCallback((): void => {
        setMobileActiveNodeId(null)
        setMobileBarAnchor(null)
    }, [])

    useEffect(() => {
        if (!mobileActiveNodeId) return
        const handleOutsideDismiss = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement | null
            if (!target?.closest('.MarkdownNotebook__mobile-block-bar') && !target?.closest('.MarkdownNotebook__row--mobile-active')) {
                clearMobileBlockBar()
            }
        }
        const handleScrollDismiss = () => clearMobileBlockBar()
        const domDocument = window.document
        domDocument.addEventListener('touchstart', handleOutsideDismiss, { passive: true })
        domDocument.addEventListener('mousedown', handleOutsideDismiss)
        window.addEventListener('scroll', handleScrollDismiss, true)
        return () => {
            domDocument.removeEventListener('touchstart', handleOutsideDismiss)
            domDocument.removeEventListener('mousedown', handleOutsideDismiss)
            window.removeEventListener('scroll', handleScrollDismiss, true)
        }
    }, [mobileActiveNodeId, clearMobileBlockBar])

    const handleRowTouchStart = (nodeId: string, isTitle: boolean, event: ReactTouchEvent<HTMLDivElement>): void => {
        if (mode !== 'edit' || isTitle) return
        const touch = event.touches[0]
        if (!touch) return
        const x = touch.clientX
        const y = touch.clientY
        const row = event.currentTarget

        if (touchStartPosRef.current?.timer) {
            clearTimeout(touchStartPosRef.current.timer)
        }

        const timer = setTimeout(() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try {
                    navigator.vibrate(40)
                } catch {
                    // Ignore vibration errors
                }
            }
            const rect = row.getBoundingClientRect()
            const vv = window.visualViewport
            const viewTop = vv?.offsetTop ?? 0
            const viewLeft = vv?.offsetLeft ?? 0
            const viewWidth = vv?.width ?? window.innerWidth
            const viewHeight = vv?.height ?? window.innerHeight
            const estimatedHeight = 48
            const margin = 10
            const placeBelow = rect.top - viewTop < estimatedHeight + margin + 12
            const left = Math.min(
                viewLeft + viewWidth - margin,
                Math.max(viewLeft + margin, rect.left + rect.width / 2)
            )
            const top = placeBelow
                ? Math.min(viewTop + viewHeight - estimatedHeight - margin, rect.bottom)
                : Math.max(viewTop + margin, rect.top)
            setMobileBarAnchor({ top, left, placement: placeBelow ? 'below' : 'above' })
            setMobileActiveNodeId(nodeId)
        }, 420)

        touchStartPosRef.current = { x, y, timer, row }
    }

    const handleRowTouchMove = (event: ReactTouchEvent<HTMLDivElement>): void => {
        if (!touchStartPosRef.current) return
        const touch = event.touches[0]
        if (!touch) return
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
        if (dx > 8 || dy > 8) {
            if (touchStartPosRef.current.timer) {
                clearTimeout(touchStartPosRef.current.timer)
            }
            touchStartPosRef.current = null
        }
    }

    const handleRowTouchEnd = (): void => {
        if (touchStartPosRef.current?.timer) {
            clearTimeout(touchStartPosRef.current.timer)
        }
        touchStartPosRef.current = null
    }

    useLayoutEffect(() => {
        const request = restoreSelectionRef.current
        if (request) {
            restoreSelectionRef.current = null
            if ('textRanges' in request) {
                restoreTextSelectionRanges(request.textRanges, blockRefs.current, listItemRefs.current)
                return
            }

            const listItemRefKey =
                request.listItemId ?? (request.listItemIndex === undefined ? undefined : String(request.listItemIndex))
            const element =
                request.tableCell !== undefined
                    ? tableCellRefs.current[getTableCellRefKey(request.nodeId, request.tableCell)]
                    : listItemRefKey === undefined
                      ? (blockRefs.current[request.nodeId] ??
                        getNotebookBlockElement(notebookRef.current, request.nodeId))
                      : (listItemRefs.current[getListItemRefKey(request.nodeId, listItemRefKey)] ??
                        (request.listItemIndex === undefined
                            ? undefined
                            : listItemRefs.current[getListItemRefKey(request.nodeId, request.listItemIndex)]))
            if (element) {
                element.focus()
                restoreSelection(element, request.start, request.end)
                scrollNotebookElementIntoView(element)
            }
            return
        }

        const focusNodeId = focusNodeRef.current
        if (focusNodeId) {
            focusNodeRef.current = null
            const element = blockRefs.current[focusNodeId]
            element?.focus()
            if (element) {
                scrollNotebookElementIntoView(element)
            }
        }
    }, [document])

    useEffect(() => {
        if (!autoFocus || mode !== 'edit') {
            return
        }

        const firstTextNode = getRenderedNodes()[0]
        const firstElement = firstTextNode ? blockRefs.current[firstTextNode.id] : null
        firstElement?.focus()
        // oxlint-disable-next-line exhaustive-deps
    }, [autoFocus, mode])

    useEffect(() => {
        if (!initialInsertMenu || initialInsertMenuAppliedRef.current || mode !== 'edit') {
            return
        }

        const nodes = getRenderedNodes()
        const node = nodes[initialInsertMenu.nodeIndex ?? 0]
        if (node) {
            initialInsertMenuAppliedRef.current = true
            setInsertMenu({ nodeId: node.id, query: initialInsertMenu.query ?? '', selectedIndex: 0, mode: 'tools' })
        }
        // oxlint-disable-next-line exhaustive-deps
    }, [initialInsertMenu, mode])

    const trackLocalSnapshot = useCallback((serialized: string): void => {
        const snapshots = localSnapshotsRef.current
        if (snapshots[snapshots.length - 1] === serialized) {
            return
        }
        snapshots.push(serialized)
        if (snapshots.length > MAX_TRACKED_LOCAL_SNAPSHOTS) {
            snapshots.splice(0, snapshots.length - MAX_TRACKED_LOCAL_SNAPSHOTS)
        }
    }, [])

    const commitDocument = useCallback(
        (nextDocument: NotebookDocument, options: CommitDocumentOptions = {}): void => {
            const editableDocument = ensureEditableNotebookDocument(nextDocument)
            const previousDocument = documentRef.current
            if (options.addToHistory ?? true) {
                pushHistoryEntry(
                    previousDocument,
                    editableDocument,
                    options.historyOperations,
                    options.coalesce ?? true
                )
            }
            // Rendered remote carets ride along with the text they sit in.
            mapRemoteCaretAnchors(previousDocument, editableDocument, options.remoteMergeVersion)

            const serialized = serializeMarkdownNotebook(editableDocument)
            documentRef.current = editableDocument
            lastSerializedValueRef.current = serialized
            trackLocalSnapshot(serialized)
            setDocument(editableDocument)
            onChange?.(serialized)
        },
        [onChange, pushHistoryEntry, mapRemoteCaretAnchors, trackLocalSnapshot]
    )
    bindCommitDocument(commitDocument)

    const applyRemoteValue = useCallback(
        (nextRemoteValue: string): void => {
            const localMarkdown = lastSerializedValueRef.current
            const snapshotIndex =
                nextRemoteValue === localMarkdown
                    ? localSnapshotsRef.current.length - 1
                    : localSnapshotsRef.current.indexOf(nextRemoteValue)
            const isKnownEcho =
                snapshotIndex !== -1 ||
                nextRemoteValue === localMarkdown ||
                nextRemoteValue === lastBaseValueRef.current ||
                localSnapshotsRef.current.includes(nextRemoteValue) ||
                (nextRemoteValue.length <= localMarkdown.length && localMarkdown.startsWith(nextRemoteValue))
            if (isKnownEcho) {
                // Own save or last-save echo: the draft already continues from this body.
                // Merging it would rewind or duplicate characters typed after the save.
                lastRemoteValueRef.current = nextRemoteValue
                lastBaseValueRef.current = nextRemoteValue
                if (snapshotIndex > 0) {
                    localSnapshotsRef.current.splice(0, snapshotIndex)
                }
                return
            }

            const mergeResult = mergeNotebookMarkdownChanges({
                baseMarkdown: lastBaseValueRef.current,
                localMarkdown: lastSerializedValueRef.current,
                remoteMarkdown: nextRemoteValue,
            })
            const previousDocument = documentRef.current
            const reconciledDocument = ensureEditableNotebookDocument(
                reconcileNotebookDocuments(previousDocument, mergeResult.document).document
            )
            const restoreSelectionRequest = notebookRef.current
                ? getCollapsedSelectionRestoreRequest(window.getSelection(), notebookRef.current)
                : null
            lastRemoteValueRef.current = nextRemoteValue
            // The merge result still contains unsaved local changes, so the server state — not the
            // merge result — is the common ancestor for the next merge.
            lastBaseValueRef.current = nextRemoteValue
            // Remote edits rebase the undo stack over the merged-in operations, so CMD+Z keeps
            // reverting only this user's changes — never a collaborator's.
            rebaseHistoryThroughDocumentChange(previousDocument, reconciledDocument)
            if (restoreSelectionRequest) {
                // Map the caret through the merged-in remote changes so it stays at the same
                // place in the text — a collaborator typing at the start of this line must
                // push the caret along with the text, not leave it at a stale offset.
                const mappedRequest = mapRestoreSelectionThroughDocumentChange(
                    restoreSelectionRequest,
                    previousDocument,
                    reconciledDocument
                )
                restoreSelectionRef.current = mappedRequest
                // Re-publish the corrected caret right away, so collaborators see this
                // client's caret at its mapped position instead of the stale offset.
                if (mappedRequest && 'nodeId' in mappedRequest) {
                    const nodeIndex = reconciledDocument.nodes.findIndex((node) => node.id === mappedRequest.nodeId)
                    const node = reconciledDocument.nodes[nodeIndex]
                    if (nodeIndex !== -1) {
                        let listItemIndex = mappedRequest.listItemIndex
                        if (node?.type === 'list' && mappedRequest.listItemId !== undefined) {
                            const mappedItemIndex = node.items.findIndex((item) => item.id === mappedRequest.listItemId)
                            if (mappedItemIndex !== -1) {
                                listItemIndex = mappedItemIndex
                            }
                        }
                        onCaretChange?.(
                            mappedRequest.tableCell !== undefined
                                ? { nodeIndex }
                                : { nodeIndex, offset: mappedRequest.start, listItemIndex }
                        )
                    }
                }
            }
            commitDocument(reconciledDocument, {
                addToHistory: false,
                remoteMergeVersion: remoteVersionRef.current,
            })

            if (mergeResult.conflicts.length) {
                onConflict?.(mergeResult.conflicts)
            }
        },
        [commitDocument, onConflict, onCaretChange, rebaseHistoryThroughDocumentChange]
    )

    useEffect(() => {
        const nextRemoteValue = pendingRemoteValueRef.current ?? remoteValue
        if (
            nextRemoteValue === null ||
            nextRemoteValue === undefined ||
            nextRemoteValue === lastRemoteValueRef.current
        ) {
            return
        }

        if (deferRemoteValue) {
            pendingRemoteValueRef.current = nextRemoteValue
            return
        }

        pendingRemoteValueRef.current = null
        applyRemoteValue(nextRemoteValue)
    }, [remoteValue, deferRemoteValue, applyRemoteValue])

    // Anchor incoming caret pings against the current document. Declared after the
    // remoteValue effect on purpose: when a save event delivers content and the author's
    // piggybacked caret together, the merge applies first and the fresh ping re-anchors
    // against the post-merge document. Heartbeats re-delivering an unchanged ping keep
    // the locally remapped position instead of resetting to the stale offset.
    useEffect(() => {
        const previousAnchors = remoteCaretAnchorsRef.current
        const nextAnchors: Record<string, RemoteCaretAnchor> = {}
        for (const caret of remoteCarets ?? []) {
            const existingAnchor = previousAnchors[caret.clientId]
            if (existingAnchor && JSON.stringify(existingAnchor.source) === JSON.stringify(caret.position)) {
                nextAnchors[caret.clientId] = {
                    caret,
                    source: existingAnchor.source,
                    position: existingAnchor.position,
                }
            } else {
                nextAnchors[caret.clientId] = { caret, source: caret.position, position: caret.position }
            }
        }
        remoteCaretAnchorsRef.current = nextAnchors
        setAdjustedRemoteCarets(
            remoteCarets?.length
                ? Object.values(nextAnchors).map((anchor) => ({ ...anchor.caret, position: anchor.position }))
                : remoteCarets
        )
    }, [remoteCarets])

    // The AI prompt keeps the insert menu open while a question is composed, but the question
    // lives in a real Prompt node — that's content, not transient UI, so it must keep syncing
    // to collaborators instead of pausing autosave like the slash menu does.
    const isInsertMenuInteractionActive = !!insertMenu && insertMenu.mode !== 'ai'
    const isTransientInteractionActive = mode === 'edit' && (isInsertMenuInteractionActive || !!floatingToolbar)

    useEffect(() => {
        onInteractionStateChange?.(isTransientInteractionActive)
        return () => {
            if (isTransientInteractionActive) {
                onInteractionStateChange?.(false)
            }
        }
    }, [isTransientInteractionActive, onInteractionStateChange])

    const deleteSelectedNotebookBlocks = useCallback(
        (replacementText: string = ''): boolean => {
            const notebookElement = notebookRef.current
            const selection = window.getSelection()
            if (!notebookElement || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
                return false
            }

            const range = selection.getRangeAt(0)
            if (!rangeIntersectsNode(range, notebookElement)) {
                return false
            }

            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const selectedEntries = nodes
                .map((node, index) => ({ node, index, element: blockRefs.current[node.id] }))
                .filter(
                    (entry): entry is { node: NotebookBlockNode; index: number; element: HTMLElement } =>
                        !!entry.element && rangeIntersectsNode(range, entry.element)
                )

            if (selectedEntries.length <= 1) {
                return false
            }

            if (selectedEntries.some((entry) => aiWritingNodeIndexSet.has(entry.index))) {
                return true
            }

            const requestFocusForDeletedSelection = (
                nextNodes: NotebookBlockNode[],
                selectionStartIndex: number
            ): void => {
                const requestFocusForNode = (node: NotebookBlockNode, placement: 'start' | 'end'): boolean => {
                    const offsetForChildren = (children: NotebookInlineNode[]): number =>
                        placement === 'start' ? 0 : getInlineText(children).length

                    if (isTextBlockNode(node)) {
                        const offset = offsetForChildren(node.children)
                        restoreSelectionRef.current = { nodeId: node.id, start: offset, end: offset }
                        return true
                    }

                    if (node.type === 'component') {
                        focusNodeRef.current = node.id
                        return true
                    }

                    if (node.type === 'list' && node.items.length) {
                        const listItemIndex = placement === 'start' ? 0 : node.items.length - 1
                        const offset = offsetForChildren(node.items[listItemIndex].children)
                        restoreSelectionRef.current = {
                            nodeId: node.id,
                            listItemIndex,
                            listItemId: node.items[listItemIndex].id,
                            start: offset,
                            end: offset,
                        }
                        return true
                    }

                    if (node.type === 'table') {
                        const tableCell = getTableEdgeCellPosition(node, placement === 'start' ? 'next' : 'previous')
                        if (!tableCell) {
                            return false
                        }

                        const offset = offsetForChildren(getTableCellAtPosition(node, tableCell)?.children ?? [])
                        restoreSelectionRef.current = { nodeId: node.id, tableCell, start: offset, end: offset }
                        return true
                    }

                    return false
                }

                for (const node of nextNodes.slice(selectionStartIndex)) {
                    if (requestFocusForNode(node, 'start')) {
                        return
                    }
                }

                for (const node of nextNodes.slice(0, selectionStartIndex).reverse()) {
                    if (requestFocusForNode(node, 'end')) {
                        return
                    }
                }
            }

            const firstEntry = selectedEntries[0]
            const lastEntry = selectedEntries[selectedEntries.length - 1]
            const selectedIndexes = new Set(selectedEntries.map((entry) => entry.index))
            let replacementNode: NotebookTextBlockNode | null = null
            let restoreOffset = 0
            const insertedChildren: NotebookInlineNode[] = replacementText
                ? [{ type: 'text', text: replacementText }]
                : []
            const insertedTextLength = getInlineText(insertedChildren).length

            if (isTextBlockNode(firstEntry.node)) {
                const firstBounds = getNormalizedSelectionBounds(firstEntry.node, firstEntry.element)
                const [beforeSelection] = splitInlineNodesAt(firstEntry.node.children, firstBounds.start)
                const beforeTextLength = getInlineText(beforeSelection).length

                if (isTextBlockNode(lastEntry.node)) {
                    const lastBounds = getNormalizedSelectionBounds(lastEntry.node, lastEntry.element)
                    const [, afterSelection] = splitInlineNodesAt(lastEntry.node.children, lastBounds.end)
                    const hasRemainingText =
                        firstBounds.start > 0 || insertedTextLength > 0 || lastBounds.end < lastBounds.textLength

                    if (hasRemainingText || firstEntry.index === 0) {
                        replacementNode = {
                            ...firstEntry.node,
                            children: normalizeInlineNodes([
                                ...beforeSelection,
                                ...insertedChildren,
                                ...afterSelection,
                            ]),
                        }
                        restoreOffset = beforeTextLength + insertedTextLength
                    }
                } else if (firstBounds.start > 0 || insertedTextLength > 0 || firstEntry.index === 0) {
                    replacementNode = {
                        ...firstEntry.node,
                        children: normalizeInlineNodes([...beforeSelection, ...insertedChildren]),
                    }
                    restoreOffset = beforeTextLength + insertedTextLength
                }
            } else if (isTextBlockNode(lastEntry.node)) {
                const lastBounds = getNormalizedSelectionBounds(lastEntry.node, lastEntry.element)
                const [, afterSelection] = splitInlineNodesAt(lastEntry.node.children, lastBounds.end)
                if (insertedTextLength > 0 || lastBounds.end < lastBounds.textLength) {
                    replacementNode = {
                        ...lastEntry.node,
                        children: normalizeInlineNodes([...insertedChildren, ...afterSelection]),
                    }
                    restoreOffset = insertedTextLength
                }
            }

            if (!replacementNode && firstEntry.index === 0) {
                replacementNode = makeEmptyNotebookTitle(`delete-selection-${firstEntry.node.id}`)
                if (insertedChildren.length) {
                    replacementNode.children = insertedChildren
                    restoreOffset = insertedTextLength
                }
            } else if (!replacementNode && insertedChildren.length) {
                replacementNode = makeEmptyParagraph(`replace-selection-${firstEntry.node.id}`)
                replacementNode.children = insertedChildren
                restoreOffset = insertedTextLength
            }

            const replacementNodes = replacementNode ? [replacementNode] : []
            const nextNodes = nodes.flatMap((node, index) => {
                if (index === firstEntry.index) {
                    return replacementNodes
                }
                return selectedIndexes.has(index) ? [] : [node]
            })

            if (replacementNode) {
                restoreSelectionRef.current = {
                    nodeId: replacementNode.id,
                    start: restoreOffset,
                    end: restoreOffset,
                }
            } else {
                requestFocusForDeletedSelection(nextNodes, firstEntry.index)
            }

            selection.removeAllRanges()
            setSelectedComponentNodeIds(new Set())
            floatingToolbarPositionLockRef.current = null
            setFloatingToolbar(null)
            const survivingIds = new Set(nextNodes.map((node) => node.id))
            const removedRefIds = new Set(
                selectedEntries
                    .filter((entry) => !survivingIds.has(entry.node.id))
                    .map((entry) => getDiscussionCommentRefId(entry.node))
                    .filter((refId): refId is string => !!refId)
            )
            commitDocument({
                ...currentDocument,
                nodes: stripNotebookRefMarksFromNodes(nextNodes, removedRefIds),
            })
            return true
        },
        [aiWritingNodeIndexSet, commitDocument]
    )

    const splitTextBlockAtCurrentSelection = useCallback((): boolean => {
        const notebookElement = notebookRef.current
        if (!notebookElement) {
            return false
        }

        const selection = window.getSelection()
        const inlineEditableElement = getInlineEditableElementForSelection(selection, notebookElement)
        if (!inlineEditableElement?.classList.contains('MarkdownNotebook__text-block')) {
            return false
        }

        const nodeId = inlineEditableElement.dataset.markdownNotebookNodeId
        if (!nodeId || insertMenu?.nodeId === nodeId) {
            return false
        }

        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
        const node = nodes[nodeIndex]
        if (!node || !isTextBlockNode(node)) {
            return false
        }

        const expandedSelection = getSelectionRange(inlineEditableElement, node.id)
        const textLength = getInlineText(node.children).length
        const selectionStart = expandedSelection
            ? Math.max(0, Math.min(Math.min(expandedSelection.start, expandedSelection.end), textLength))
            : textLength
        const selectionEnd = expandedSelection
            ? Math.max(selectionStart, Math.min(Math.max(expandedSelection.start, expandedSelection.end), textLength))
            : selectionStart
        const [before, selectionAndAfter] = splitInlineNodesAt(node.children, selectionStart)
        const [, after] = splitInlineNodesAt(selectionAndAfter, selectionEnd - selectionStart)
        let replacementNodes: NotebookBlockNode[]

        if (nodeIndex === 0) {
            const nextParagraph = makeEmptyParagraph(`after-title-${node.id}`)
            nextParagraph.children = after
            replacementNodes = [{ ...node, type: 'heading', level: 1, children: before }, nextParagraph]
            restoreSelectionRef.current = { nodeId: nextParagraph.id, start: 0, end: 0 }
        } else if (node.type === 'heading') {
            if (selectionStart === 0) {
                const previousParagraph = makeEmptyParagraph(`before-${node.id}`)
                replacementNodes = [previousParagraph, { ...node, children: after }]
                restoreSelectionRef.current = { nodeId: previousParagraph.id, start: 0, end: 0 }
            } else {
                const nextHeading = { ...node, id: makeEmptyParagraph(`after-${node.id}`).id, children: after }
                replacementNodes = [{ ...node, children: before }, nextHeading]
                restoreSelectionRef.current = { nodeId: nextHeading.id, start: 0, end: 0 }
            }
        } else if (node.type === 'blockquote') {
            if (selectionStart === 0) {
                const previousParagraph = makeEmptyParagraph(`before-${node.id}`)
                replacementNodes = [previousParagraph, { ...node, children: after }]
                restoreSelectionRef.current = { nodeId: previousParagraph.id, start: 0, end: 0 }
            } else {
                const nextBlockquote = { ...node, id: makeEmptyParagraph(`after-${node.id}`).id, children: after }
                replacementNodes = [{ ...node, children: before }, nextBlockquote]
                restoreSelectionRef.current = { nodeId: nextBlockquote.id, start: 0, end: 0 }
            }
        } else {
            const nextParagraph = makeEmptyParagraph(`after-${node.id}`)
            nextParagraph.children = after
            replacementNodes = [{ ...node, children: before }, nextParagraph]
            restoreSelectionRef.current = { nodeId: nextParagraph.id, start: 0, end: 0 }
        }

        commitDocument({
            ...currentDocument,
            nodes: nodes.flatMap((currentNode) =>
                currentNode.id === node.id ? withPreservedGroupStart(node, replacementNodes) : [currentNode]
            ),
        })
        return true
    }, [commitDocument, insertMenu?.nodeId])

    const splitListItemAtCurrentSelection = useCallback((): boolean => {
        const notebookElement = notebookRef.current
        if (!notebookElement) {
            return false
        }

        const selection = window.getSelection()
        const inlineEditableElement = getInlineEditableElementForSelection(selection, notebookElement)
        if (!inlineEditableElement?.classList.contains('MarkdownNotebook__list-item-content')) {
            return false
        }

        const nodeId = inlineEditableElement.dataset.markdownNotebookNodeId
        const itemIndex = Number(inlineEditableElement.dataset.markdownNotebookListItemIndex)
        if (!nodeId || !Number.isInteger(itemIndex)) {
            return false
        }

        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const node = nodes.find((currentNode) => currentNode.id === nodeId)
        if (!node || node.type !== 'list') {
            return false
        }

        const itemId = inlineEditableElement.dataset.markdownNotebookListItemId
        const targetItemIndex = getListItemIndex(node.items, itemIndex, itemId)
        const item = node.items[targetItemIndex]
        if (!item) {
            return false
        }

        const expandedSelection = getSelectionRange(inlineEditableElement, node.id)
        const textLength = getInlineText(item.children).length
        const selectionStart = expandedSelection
            ? Math.max(0, Math.min(Math.min(expandedSelection.start, expandedSelection.end), textLength))
            : textLength
        const selectionEnd = expandedSelection
            ? Math.max(selectionStart, Math.min(Math.max(expandedSelection.start, expandedSelection.end), textLength))
            : selectionStart

        if (!textLength && selectionStart === 0 && selectionEnd === 0) {
            if (item.depth > 0) {
                const nextItems = shiftListItemSubtreeDepth(node.items, targetItemIndex, 'out', node.ordered)
                if (!nextItems) {
                    return false
                }

                restoreSelectionRef.current = {
                    nodeId: node.id,
                    listItemIndex: targetItemIndex,
                    listItemId: item.id,
                    start: 0,
                    end: 0,
                }
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.map((currentNode) =>
                        currentNode.id === node.id ? { ...node, items: nextItems } : currentNode
                    ),
                })
                return true
            }

            const replacement = getListItemParagraphReplacement(node, targetItemIndex)
            if (!replacement) {
                return false
            }

            restoreSelectionRef.current = { nodeId: replacement.paragraphId, start: 0, end: 0 }
            commitDocument({
                ...currentDocument,
                nodes: nodes.flatMap((currentNode) =>
                    currentNode.id === node.id ? replacement.replacementNodes : [currentNode]
                ),
            })
            return true
        }

        const [before, selectionAndAfter] = splitInlineNodesAt(item.children, selectionStart)
        const [, after] = splitInlineNodesAt(selectionAndAfter, selectionEnd - selectionStart)
        const nextItem: NotebookListItem = {
            id: makeListItemId(`split-${node.id}-${item.id ?? String(targetItemIndex)}`),
            children: after,
            depth: item.depth,
            ordered: item.ordered ?? node.ordered,
            // A new item split off a task starts as an unchecked task
            checked: item.checked !== undefined ? false : undefined,
        }
        const nextItems = [...node.items]
        nextItems[targetItemIndex] = { ...item, children: before }
        nextItems.splice(targetItemIndex + 1, 0, nextItem)
        restoreSelectionRef.current = {
            nodeId: node.id,
            listItemIndex: targetItemIndex + 1,
            listItemId: nextItem.id,
            start: 0,
            end: 0,
        }
        commitDocument({
            ...currentDocument,
            nodes: nodes.map((currentNode) =>
                currentNode.id === node.id ? { ...node, items: nextItems } : currentNode
            ),
        })
        return true
    }, [commitDocument])

    const shiftListItemDepthAtCurrentSelection = useCallback(
        (direction: 'in' | 'out'): boolean => {
            const element = getSelectedInlineEditableElementOfType(
                notebookRef.current,
                'MarkdownNotebook__list-item-content'
            )
            if (!element) {
                return false
            }

            const nodeId = element.dataset.markdownNotebookNodeId
            const itemIndex = Number(element.dataset.markdownNotebookListItemIndex)
            if (!nodeId || !Number.isInteger(itemIndex)) {
                return false
            }

            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const node = nodes.find((currentNode) => currentNode.id === nodeId)
            if (!node || node.type !== 'list') {
                return false
            }

            const itemId = element.dataset.markdownNotebookListItemId
            const targetItemIndex = getListItemIndex(node.items, itemIndex, itemId)
            const item = node.items[targetItemIndex]
            if (!item) {
                return false
            }

            const nextItems = shiftListItemSubtreeDepth(node.items, targetItemIndex, direction, node.ordered)
            if (!nextItems) {
                return false
            }

            const offset = getCollapsedSelectionRange(element, node.id)?.start ?? 0
            restoreSelectionRef.current = {
                nodeId: node.id,
                listItemIndex: targetItemIndex,
                listItemId: item.id,
                start: offset,
                end: offset,
            }
            commitDocument(
                {
                    ...currentDocument,
                    nodes: nodes.map((currentNode) =>
                        currentNode.id === node.id ? { ...node, items: nextItems } : currentNode
                    ),
                },
                // A Tab indent must be its own undo step, not folded into the typing run that
                // preceded it — otherwise Cmd+Z can't undo just the accidental indent.
                { coalesce: false }
            )
            return true
        },
        [commitDocument]
    )

    const deleteListItemAtCurrentSelection = useCallback(
        (direction: 'backward' | 'forward'): boolean => {
            const element = getSelectedInlineEditableElementOfType(
                notebookRef.current,
                'MarkdownNotebook__list-item-content'
            )
            if (!element) {
                return false
            }

            const nodeId = element.dataset.markdownNotebookNodeId
            const itemIndex = Number(element.dataset.markdownNotebookListItemIndex)
            if (!nodeId || !Number.isInteger(itemIndex)) {
                return false
            }

            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const node = nodes.find((currentNode) => currentNode.id === nodeId)
            if (!node || node.type !== 'list') {
                return false
            }

            const itemId = element.dataset.markdownNotebookListItemId
            const targetItemIndex = getListItemIndex(node.items, itemIndex, itemId)
            const item = node.items[targetItemIndex]
            if (!item) {
                return false
            }

            const selection = getCollapsedSelectionRange(element, node.id)
            if (!selection || selection.start !== 0 || selection.end !== 0) {
                return false
            }

            if (direction === 'forward' && getInlineText(item.children).length) {
                return false
            }

            if (item.depth > 0) {
                const nextItems = shiftListItemSubtreeDepth(node.items, targetItemIndex, 'out', node.ordered)
                if (!nextItems) {
                    return false
                }

                restoreSelectionRef.current = {
                    nodeId: node.id,
                    listItemIndex: targetItemIndex,
                    listItemId: item.id,
                    start: 0,
                    end: 0,
                }
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.map((currentNode) =>
                        currentNode.id === node.id ? { ...node, items: nextItems } : currentNode
                    ),
                })
                return true
            }

            const replacement = getListItemParagraphReplacement(node, targetItemIndex)
            if (!replacement) {
                return false
            }

            restoreSelectionRef.current = { nodeId: replacement.paragraphId, start: 0, end: 0 }
            commitDocument({
                ...currentDocument,
                nodes: nodes.flatMap((currentNode) =>
                    currentNode.id === node.id ? replacement.replacementNodes : [currentNode]
                ),
            })
            return true
        },
        [commitDocument]
    )

    // A ranged selection that reaches a list item's edge (e.g. the whole item selected up to
    // the next item's start) must be deleted through the model: the browser's native delete
    // merges `<li>` elements in place, and React then crashes on its next commit because the
    // list structure it manages no longer matches the DOM (removeChild NotFoundError).
    const deleteListItemRangeAtCurrentSelection = useCallback(
        (replacementText: string = '', claimSingleItemRange: boolean = false): boolean => {
            const notebookElement = notebookRef.current
            const selection = window.getSelection()
            if (!notebookElement || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
                return false
            }

            const element = getSelectedInlineEditableElementOfType(
                notebookElement,
                'MarkdownNotebook__list-item-content'
            )
            const nodeId = element?.dataset.markdownNotebookNodeId
            if (!element || !nodeId) {
                return false
            }

            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const node = nodes.find((currentNode) => currentNode.id === nodeId)
            if (!node || node.type !== 'list') {
                return false
            }

            const range = selection.getRangeAt(0)
            const listBlockElement = blockRefs.current[node.id]
            if (
                !listBlockElement ||
                !listBlockElement.contains(range.startContainer) ||
                !listBlockElement.contains(range.endContainer)
            ) {
                return false
            }

            // A range confined to a single item's content element is safe to leave to the
            // browser: only that item's manually synced innerHTML changes. Cut still claims it,
            // because cut prevents the browser default that would otherwise delete the text.
            const startElement = getClosestEditableBlockElement(getElementForNode(range.startContainer))
            const endElement = getClosestEditableBlockElement(getElementForNode(range.endContainer))
            if (!claimSingleItemRange && startElement === element && endElement === element) {
                return false
            }

            const itemRanges = node.items.flatMap((_, itemIndex) => {
                const itemElement = listItemRefs.current[getListItemRefKey(node.id, itemIndex)]
                const itemRange = itemElement ? getSelectionRange(itemElement, node.id) : null
                if (!itemRange) {
                    return []
                }
                return [
                    {
                        itemIndex,
                        start: Math.min(itemRange.start, itemRange.end),
                        end: Math.max(itemRange.start, itemRange.end),
                    },
                ]
            })

            // A zero-length range at the selection's edge is a boundary touch that selects
            // nothing in that item.
            while (itemRanges.length > 1 && itemRanges[0].start === itemRanges[0].end) {
                itemRanges.shift()
            }
            while (
                itemRanges.length > 1 &&
                itemRanges[itemRanges.length - 1].start === itemRanges[itemRanges.length - 1].end
            ) {
                itemRanges.pop()
            }
            const firstRange = itemRanges[0]
            const lastRange = itemRanges[itemRanges.length - 1]
            if (!firstRange || !lastRange) {
                return false
            }

            const deletion = deleteListItemSelectionRange(
                node.items,
                {
                    firstItemIndex: firstRange.itemIndex,
                    firstStart: firstRange.start,
                    lastItemIndex: lastRange.itemIndex,
                    lastEnd: lastRange.end,
                },
                replacementText
            )
            if (!deletion) {
                return false
            }

            restoreSelectionRef.current = {
                nodeId: node.id,
                listItemIndex: deletion.caretItemIndex,
                listItemId: deletion.caretItemId,
                start: deletion.caretOffset,
                end: deletion.caretOffset,
            }
            commitDocument({
                ...currentDocument,
                nodes: nodes.map((currentNode) =>
                    currentNode.id === node.id ? { ...node, items: deletion.items } : currentNode
                ),
            })
            return true
        },
        [commitDocument]
    )

    const insertTableRowAtCurrentSelection = useCallback((): boolean => {
        const element = getSelectedInlineEditableElementOfType(
            notebookRef.current,
            'MarkdownNotebook__table-cell-content'
        )
        const position = element ? getTableCellPositionFromElement(element) : null
        const nodeId = element?.dataset.markdownNotebookNodeId
        if (!element || !position || !nodeId) {
            return false
        }

        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const node = nodes.find((currentNode) => currentNode.id === nodeId)
        if (!node || node.type !== 'table') {
            return false
        }

        if (position.section === 'header' && node.rows.length) {
            const targetPosition: TableCellPosition = {
                section: 'body',
                rowIndex: 0,
                columnIndex: position.columnIndex,
            }
            const cellElement = tableCellRefs.current[getTableCellRefKey(node.id, targetPosition)]
            if (cellElement) {
                cellElement.focus()
                restoreSelection(cellElement, 0, 0)
            }
            return true
        }

        const columnCount = getTableColumnCount(node)
        const insertIndex =
            position.section === 'header' ? 0 : Math.max(0, Math.min(position.rowIndex + 1, node.rows.length))
        const nextRows = node.rows.map((row) => normalizeTableRow(row, columnCount))
        nextRows.splice(insertIndex, 0, makeEmptyTableRow(columnCount))
        restoreSelectionRef.current = {
            nodeId: node.id,
            tableCell: { section: 'body', rowIndex: insertIndex, columnIndex: position.columnIndex },
            start: 0,
            end: 0,
        }
        commitDocument({
            ...currentDocument,
            nodes: nodes.map((currentNode) => (currentNode.id === node.id ? { ...node, rows: nextRows } : currentNode)),
        })
        return true
    }, [commitDocument])

    const startInsertMenuAtCurrentTextSelection = useCallback(
        (query: string = ''): boolean => {
            const notebookElement = notebookRef.current
            if (!notebookElement) {
                return false
            }

            const selection = window.getSelection()
            const inlineEditableElement = getInlineEditableElementForSelection(selection, notebookElement)
            if (
                !inlineEditableElement ||
                inlineEditableElement.classList.contains('MarkdownNotebook__text-block--ai-prompt')
            ) {
                return false
            }

            const isTextBlock = inlineEditableElement.classList.contains('MarkdownNotebook__text-block')
            const isListItem = inlineEditableElement.classList.contains('MarkdownNotebook__list-item-content')
            if (!isTextBlock && !isListItem) {
                return false
            }

            const nodeId = inlineEditableElement.dataset.markdownNotebookNodeId
            if (!nodeId) {
                return false
            }

            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            const node = nodes[nodeIndex]
            if (!node) {
                return false
            }

            const expandedSelection = getSelectionRange(inlineEditableElement, node.id)
            const openDetachedMenu = (replacementNodes: NotebookBlockNode[], commandNodeId: string): boolean => {
                restoreSelectionRef.current = {
                    nodeId: commandNodeId,
                    start: query.length,
                    end: query.length,
                }
                onInteractionStateChange?.(true)
                setInsertMenu({
                    nodeId: commandNodeId,
                    query,
                    selectedIndex: 0,
                    mode: 'tools',
                    detached: true,
                    source: 'slash',
                })
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.flatMap((currentNode) =>
                        currentNode.id === node.id ? replacementNodes : [currentNode]
                    ),
                })
                return true
            }

            if (nodeIndex === 0) {
                return false
            }

            if (isListItem && node.type === 'list') {
                const itemId = inlineEditableElement.dataset.markdownNotebookListItemId
                const rawIndex = Number(inlineEditableElement.dataset.markdownNotebookListItemIndex)
                const itemIndex = getListItemIndex(node.items, rawIndex, itemId)
                const item = node.items[itemIndex]
                if (!item) {
                    return false
                }

                const textLength = getInlineText(item.children).length
                const selectionStart = expandedSelection
                    ? Math.max(0, Math.min(Math.min(expandedSelection.start, expandedSelection.end), textLength))
                    : textLength
                const selectionEnd = expandedSelection
                    ? Math.max(
                          selectionStart,
                          Math.min(Math.max(expandedSelection.start, expandedSelection.end), textLength)
                      )
                    : selectionStart
                const [before, selectionAndAfter] = splitInlineNodesAt(item.children, selectionStart)
                const [, after] = splitInlineNodesAt(selectionAndAfter, selectionEnd - selectionStart)
                const commandNode = makeEmptyParagraph(`slash-command-${node.id}`)
                commandNode.children = query ? [{ type: 'text', text: query }] : []

                const beforeItems = node.items.slice(0, itemIndex)
                if (getInlineText(before).length > 0) {
                    beforeItems.push({ ...item, children: normalizeInlineNodes(before) })
                }
                const afterItems: typeof node.items = []
                if (getInlineText(after).length > 0) {
                    afterItems.push({
                        ...item,
                        id: makeListItemId(`after-slash-${item.id ?? String(itemIndex)}`),
                        children: normalizeInlineNodes(after),
                    })
                }
                afterItems.push(...node.items.slice(itemIndex + 1))

                const replacementNodes: NotebookBlockNode[] = []
                if (beforeItems.length) {
                    replacementNodes.push({ ...node, items: beforeItems })
                }
                replacementNodes.push(commandNode)
                if (afterItems.length) {
                    replacementNodes.push({
                        ...node,
                        id: makeEmptyParagraph(`after-slash-list-${node.id}`).id,
                        items: afterItems,
                    })
                }
                return openDetachedMenu(replacementNodes, commandNode.id)
            }

            if (!isTextBlockNode(node)) {
                return false
            }

            const textLength = getInlineText(node.children).length
            const selectionStart = expandedSelection
                ? Math.max(0, Math.min(Math.min(expandedSelection.start, expandedSelection.end), textLength))
                : textLength
            const selectionEnd = expandedSelection
                ? Math.max(
                      selectionStart,
                      Math.min(Math.max(expandedSelection.start, expandedSelection.end), textLength)
                  )
                : selectionStart

            const [before, selectionAndAfter] = splitInlineNodesAt(node.children, selectionStart)
            const [, after] = splitInlineNodesAt(selectionAndAfter, selectionEnd - selectionStart)
            const commandNode = makeEmptyParagraph(`slash-command-${node.id}`)
            commandNode.children = query ? [{ type: 'text', text: query }] : []
            const replacementNodes: NotebookBlockNode[] = []

            if (getInlineText(before).length > 0) {
                replacementNodes.push({ ...node, children: normalizeInlineNodes(before) })
            }

            replacementNodes.push(commandNode)

            if (getInlineText(after).length > 0) {
                const afterNodeId = makeEmptyParagraph(`after-slash-command-${node.id}`).id
                replacementNodes.push({
                    ...node,
                    id: afterNodeId,
                    children: normalizeInlineNodes(after),
                })
            }

            return openDetachedMenu(replacementNodes, commandNode.id)
        },
        [commitDocument, onInteractionStateChange]
    )

    // Backspace at the start of a text block whose previous sibling is not a text block: the
    // previous block must never be deleted wholesale — the caret moves into its trailing edge
    // (merging the text into a trailing list item where possible) so further backspaces delete
    // characters.
    const mergeTextBlockIntoPreviousBlock = useCallback(
        (nodeIndex: number): boolean => {
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const node = nodes[nodeIndex]
            const previousNode = nodes[nodeIndex - 1]
            if (!node || !isTextBlockNode(node) || !previousNode || isTextBlockNode(previousNode)) {
                return false
            }

            const isEmptyTextBlock = !getInlineText(node.children).length

            if (previousNode.type === 'list') {
                const lastItemIndex = previousNode.items.length - 1
                const lastItem = previousNode.items[lastItemIndex]
                if (!lastItem) {
                    return false
                }

                const lastItemTextLength = getInlineText(lastItem.children).length
                restoreSelectionRef.current = {
                    nodeId: previousNode.id,
                    listItemIndex: lastItemIndex,
                    listItemId: lastItem.id,
                    start: lastItemTextLength,
                    end: lastItemTextLength,
                }
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.flatMap((currentNode, index) => {
                        if (index === nodeIndex - 1 && currentNode.type === 'list') {
                            return [
                                {
                                    ...currentNode,
                                    items: currentNode.items.map((item, itemIndex) =>
                                        itemIndex === lastItemIndex
                                            ? {
                                                  ...item,
                                                  children: normalizeInlineNodes([...item.children, ...node.children]),
                                              }
                                            : item
                                    ),
                                },
                            ]
                        }
                        if (index === nodeIndex) {
                            return []
                        }
                        return [currentNode]
                    }),
                })
                return true
            }

            if (previousNode.type === 'code') {
                const codeTextLength = previousNode.text.length
                if (isEmptyTextBlock) {
                    restoreSelectionRef.current = {
                        nodeId: previousNode.id,
                        start: codeTextLength,
                        end: codeTextLength,
                    }
                    commitDocument({
                        ...currentDocument,
                        nodes: nodes.filter((_, index) => index !== nodeIndex),
                    })
                    return true
                }

                const element = blockRefs.current[previousNode.id]
                if (element) {
                    element.focus()
                    restoreSelection(element, codeTextLength, codeTextLength)
                }
                return true
            }

            if (previousNode.type === 'table') {
                const lastCellPosition = getTableEdgeCellPosition(previousNode, 'previous')
                if (!lastCellPosition) {
                    return false
                }

                const offset = getInlineText(
                    getTableCellAtPosition(previousNode, lastCellPosition)?.children ?? []
                ).length
                if (isEmptyTextBlock) {
                    restoreSelectionRef.current = {
                        nodeId: previousNode.id,
                        tableCell: lastCellPosition,
                        start: offset,
                        end: offset,
                    }
                    commitDocument({
                        ...currentDocument,
                        nodes: nodes.filter((_, index) => index !== nodeIndex),
                    })
                    return true
                }

                const element = tableCellRefs.current[getTableCellRefKey(previousNode.id, lastCellPosition)]
                if (element) {
                    element.focus()
                    restoreSelection(element, offset, offset)
                }
                return true
            }

            if (previousNode.type === 'component') {
                if (isEmptyTextBlock && node.type === 'paragraph') {
                    focusNodeRef.current = previousNode.id
                    commitDocument({
                        ...currentDocument,
                        nodes: nodes.filter((_, index) => index !== nodeIndex),
                    })
                    return true
                }

                blockRefs.current[previousNode.id]?.focus()
                return true
            }

            return false
        },
        [commitDocument]
    )

    const deleteTextAtCurrentSelection = useCallback(
        (direction: 'backward' | 'forward'): boolean => {
            const notebookElement = notebookRef.current
            if (!notebookElement) {
                return false
            }

            const selection = window.getSelection()
            const inlineEditableElement = getInlineEditableElementForSelection(selection, notebookElement)
            if (!inlineEditableElement?.classList.contains('MarkdownNotebook__text-block')) {
                return false
            }

            const nodeId = inlineEditableElement.dataset.markdownNotebookNodeId
            if (!nodeId) {
                return false
            }

            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            const node = nodes[nodeIndex]
            if (!node || !isTextBlockNode(node)) {
                return false
            }

            const expandedSelection = getSelectionRange(inlineEditableElement, node.id)
            const textLength = getInlineText(node.children).length
            const selectionStart = expandedSelection
                ? Math.max(0, Math.min(Math.min(expandedSelection.start, expandedSelection.end), textLength))
                : textLength
            const selectionEnd = expandedSelection
                ? Math.max(
                      selectionStart,
                      Math.min(Math.max(expandedSelection.start, expandedSelection.end), textLength)
                  )
                : selectionStart

            if (selectionStart !== selectionEnd) {
                const [beforeSelection, selectionAndAfter] = splitInlineNodesAt(node.children, selectionStart)
                const [, afterSelection] = splitInlineNodesAt(selectionAndAfter, selectionEnd - selectionStart)
                const nextChildren = normalizeInlineNodes([...beforeSelection, ...afterSelection])

                restoreSelectionRef.current = { nodeId: node.id, start: selectionStart, end: selectionStart }
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.map((currentNode) =>
                        currentNode.id === node.id && isTextBlockNode(currentNode)
                            ? { ...currentNode, children: nextChildren }
                            : currentNode
                    ),
                })
                return true
            }

            if (direction === 'backward' && selectionStart === 0 && nodeIndex === 0) {
                restoreSelectionRef.current = { nodeId: node.id, start: 0, end: 0 }
                return true
            }

            if (direction === 'forward' || selectionStart !== 0 || nodeIndex <= 0) {
                return false
            }

            const previousNode = nodes[nodeIndex - 1]
            if (textLength === 0 && node.type === 'paragraph' && previousNode?.type === 'component') {
                focusNodeRef.current = previousNode.id
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.filter((_, index) => index !== nodeIndex),
                })
                return true
            }

            if (
                (node.type === 'heading' || node.type === 'blockquote') &&
                (!isTextBlockNode(previousNode) || !textBlocksShareContinuationStyle(previousNode, node))
            ) {
                restoreSelectionRef.current = { nodeId: node.id, start: 0, end: 0 }
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.map((currentNode) =>
                        currentNode.id === node.id && isTextBlockNode(currentNode)
                            ? {
                                  ...currentNode,
                                  // A quoted heading downgrades to quote text, staying in the quote
                                  type: currentNode.blockquote ? 'blockquote' : 'paragraph',
                                  level: undefined,
                                  blockquote: undefined,
                              }
                            : currentNode
                    ),
                })
                return true
            }

            if (isTextBlockNode(previousNode)) {
                const previousTextLength = getInlineText(previousNode.children).length
                const mergedNode: NotebookTextBlockNode = {
                    ...previousNode,
                    children: normalizeInlineNodes([...previousNode.children, ...node.children]),
                }

                restoreSelectionRef.current = {
                    nodeId: previousNode.id,
                    start: previousTextLength,
                    end: previousTextLength,
                }
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.flatMap((currentNode, index) => {
                        if (index === nodeIndex - 1) {
                            return [mergedNode]
                        }
                        if (index === nodeIndex) {
                            return []
                        }
                        return [currentNode]
                    }),
                })
                return true
            }

            return mergeTextBlockIntoPreviousBlock(nodeIndex)
        },
        [commitDocument, mergeTextBlockIntoPreviousBlock]
    )

    // Chrome's default insertParagraph inside the code <pre> appends <br> elements, which are
    // invisible to textContent and therefore never reach the document model. Insert a literal
    // newline through the model instead.
    const insertNewlineInCodeBlockAtCurrentSelection = useCallback((): boolean => {
        const element = getSelectedInlineEditableElementOfType(notebookRef.current, 'MarkdownNotebook__code-block')
        const nodeId = element?.dataset.markdownNotebookNodeId
        if (!element || !nodeId) {
            return false
        }

        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const node = nodes.find((currentNode) => currentNode.id === nodeId)
        if (!node || node.type !== 'code') {
            return false
        }

        const range = getSelectionRange(element, nodeId)
        const textLength = node.text.length
        const start = range ? Math.max(0, Math.min(Math.min(range.start, range.end), textLength)) : textLength
        const end = range ? Math.max(start, Math.min(Math.max(range.start, range.end), textLength)) : textLength
        const nextText = `${node.text.slice(0, start)}\n${node.text.slice(end)}`

        restoreSelectionRef.current = { nodeId, start: start + 1, end: start + 1 }
        commitDocument({
            ...currentDocument,
            nodes: nodes.map((currentNode) =>
                currentNode.id === nodeId && currentNode.type === 'code'
                    ? { ...currentNode, text: nextText }
                    : currentNode
            ),
        })
        return true
    }, [commitDocument])

    const updateNode = useCallback(
        (
            nodeId: string,
            updater: (node: NotebookBlockNode) => NotebookBlockNode | null,
            extra?: { annotations?: NotebookDocument['annotations'] }
        ): void => {
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            let didUpdate = false
            let historyOperations: NotebookOperation[] | undefined
            const nextNodes = nodes.flatMap((node, index) => {
                if (didUpdate || node.id !== nodeId) {
                    return [node]
                }
                didUpdate = true
                const updatedNode = updater(cloneNotebookNode(node))
                historyOperations = getComponentNodeUpdateHistoryOperations(nodes, index, node, updatedNode)
                return updatedNode ? [updatedNode] : []
            })

            if (!didUpdate && !extra?.annotations) {
                return
            }

            commitDocument(
                {
                    ...currentDocument,
                    nodes: didUpdate ? nextNodes : currentDocument.nodes,
                    ...(extra?.annotations ? { annotations: extra.annotations } : {}),
                },
                {
                    historyOperations,
                }
            )
        },
        [commitDocument]
    )

    const updateAnnotations = useCallback(
        (updater: (current: NonNullable<NotebookDocument['annotations']>) => NotebookDocument['annotations']): void => {
            const currentDocument = documentRef.current
            const next = updater(currentDocument.annotations || {})
            commitDocument({
                ...currentDocument,
                annotations: next && Object.keys(next).length ? next : undefined,
            })
        },
        [commitDocument]
    )

    const replaceNode = useCallback(
        (nodeId: string, nextNode: NotebookBlockNode): void => {
            updateNode(nodeId, (previousNode) => withPreservedGroupStart(previousNode, [nextNode])[0])
        },
        [updateNode]
    )

    // Deleting a discussion comment also unwraps its `<ref>` highlight; deleting anything
    // else is a plain removal.
    const deleteNodeWithRefCleanup = useCallback(
        (nodeId: string): void => {
            commitDocument(removeNotebookNodesWithRefCleanup(documentRef.current, new Set([nodeId])))
        },
        [commitDocument]
    )

    const replaceNodeWithInsertedComponent = useCallback(
        (nodeId: string, nextNode: NotebookComponentBlockNode): void => {
            const definition = getMarkdownNotebookComponentDefinition(mergedRegistry, nextNode.tagName)
            const insertedPanels = getInsertedComponentPanelVisibility(nextNode)
            const insertedNode = withPersistedComponentPanelProps(nextNode, definition, insertedPanels)
            markNotebookNodeFreshlyInserted(nextNode.id)
            focusNodeRef.current = nextNode.id
            replaceNode(nodeId, insertedNode)
        },
        [mergedRegistry, replaceNode]
    )

    const startInlineCommentFromSlash = (nodeId: string): void => {
        const node = documentRef.current.nodes.find((entry) => entry.id === nodeId)
        if (!node) return

        if (isTextBlockNode(node)) {
            const rawText = getInlineText(node.children)
            const slash =
                getSlashTokenAt(rawText, rawText.length) || getSlashTokenAt(rawText, Math.max(0, rawText.length - 1))
            if (slash) {
                updateNode(nodeId, (current) =>
                    isTextBlockNode(current)
                        ? { ...current, children: splitInlineNodesAt(current.children, slash.start)[0] }
                        : current
                )
            }
        }

        setInsertMenu(null)
        startBlockCommentForNode(nodeId)
    }

    const insertMenuApi = useMemo<MarkdownNotebookInsertMenuApi>(
        () => ({
            insertComponent: (targetNodeId, tagName, props) =>
                replaceNodeWithInsertedComponent(targetNodeId, {
                    id: makeEmptyParagraph(`component-${tagName}`).id,
                    type: 'component',
                    tagName,
                    props,
                }),
            openPhilosopherInvite: (targetNodeId) => {
                const anchorElement = blockRefs.current[targetNodeId]
                setInsertMenu(null)
                setInvitePicker({ nodeId: targetNodeId })
                setInvitePickerPosition(
                    anchorElement
                        ? getInsertMenuPosition(anchorElement, {
                              width: INVITE_PICKER_WIDTH,
                              maxHeight: INVITE_PICKER_MAX_HEIGHT,
                              minHeight: INVITE_PICKER_MIN_HEIGHT,
                          })
                        : null
                )
            },
            openInlineComment: (targetNodeId) => startInlineCommentFromSlash(targetNodeId),
        }),
        [replaceNodeWithInsertedComponent]
    )

    const replaceNodeWithNodes = useCallback(
        (nodeId: string, replacementNodes: NotebookBlockNode[]): void => {
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            let didReplace = false
            commitDocument({
                ...currentDocument,
                nodes: nodes.flatMap((node) => {
                    if (didReplace || node.id !== nodeId) {
                        return [node]
                    }
                    didReplace = true
                    return withPreservedGroupStart(node, replacementNodes)
                }),
            })
        },
        [commitDocument]
    )

    const insertNodesAfterNode = useCallback(
        (nodeId: string, insertedNodes: NotebookBlockNode[]): void => {
            if (!insertedNodes.length) {
                return
            }

            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            if (nodeIndex === -1) {
                return
            }

            commitDocument({
                ...currentDocument,
                nodes: [...nodes.slice(0, nodeIndex + 1), ...insertedNodes, ...nodes.slice(nodeIndex + 1)],
            })

            const firstInsertedNode = insertedNodes[0]
            if (firstInsertedNode.type === 'component') {
                focusNodeRef.current = firstInsertedNode.id
            } else if (isTextBlockNode(firstInsertedNode)) {
                const offset = getInlineText(firstInsertedNode.children).length
                restoreSelectionRef.current = { nodeId: firstInsertedNode.id, start: offset, end: offset }
            }
        },
        [commitDocument]
    )

    const insertMarkdownAfterNode = useCallback(
        (nodeId: string, markdown: string, seed: string): boolean => {
            const pastedNodes = rekeyNotebookNodes(parseMarkdownNotebook(markdown).nodes, seed)
            if (!pastedNodes.length) {
                return false
            }

            insertNodesAfterNode(nodeId, pastedNodes)
            return true
        },
        [insertNodesAfterNode]
    )

    const deleteNodeBefore = useCallback(
        (nodeId: string, options: { requireSameTextStyle?: boolean } = {}): boolean => {
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            if (nodeIndex <= 0) {
                return false
            }

            const previousNode = nodes[nodeIndex - 1]
            const currentNode = nodes[nodeIndex]
            if (isTextBlockNode(previousNode) && isTextBlockNode(currentNode)) {
                if (options.requireSameTextStyle && !textBlocksShareContinuationStyle(previousNode, currentNode)) {
                    return false
                }

                const previousTextLength = getInlineText(previousNode.children).length
                const mergedNode: NotebookTextBlockNode = {
                    ...previousNode,
                    children: normalizeInlineNodes([...previousNode.children, ...currentNode.children]),
                }

                restoreSelectionRef.current = {
                    nodeId: previousNode.id,
                    start: previousTextLength,
                    end: previousTextLength,
                }
                commitDocument({
                    ...currentDocument,
                    nodes: nodes.flatMap((node, index) => {
                        if (index === nodeIndex - 1) {
                            return [mergedNode]
                        }
                        if (index === nodeIndex) {
                            return []
                        }
                        return [node]
                    }),
                })
                return true
            }

            if (options.requireSameTextStyle) {
                return false
            }

            return mergeTextBlockIntoPreviousBlock(nodeIndex)
        },
        [commitDocument, mergeTextBlockIntoPreviousBlock]
    )

    const openAIPrompt = useCallback(
        (
            nodeId: string,
            options?: {
                source?: 'slash' | 'selection'
                selectedMarkdown?: string
                selectedRefId?: string
                question?: string
                autoRun?: boolean
                selectionStart?: number
                selectionEnd?: number
                targetNodeId?: string
                listItemIndex?: number
            }
        ): void => {
            onInteractionStateChange?.(true)
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const planned = planOpenAIPromptInsert(nodes, nodeId, options)
            commitDocument({
                ...currentDocument,
                nodes: planned.nodes,
            })
            setInsertMenu({
                nodeId: planned.promptId,
                query: options?.question ?? '',
                selectedIndex: 0,
                mode: 'ai',
                source: options?.source ?? 'slash',
                selectedMarkdown: options?.selectedMarkdown,
                selectedRefId: options?.selectedRefId,
            })
        },
        [commitDocument, onInteractionStateChange]
    )

    const updateAIPromptQuery = (nodeId: string, query: string): void => {
        setInsertMenu((currentMenu) => {
            if (!currentMenu || currentMenu.nodeId !== nodeId || currentMenu.mode !== 'ai') {
                return currentMenu
            }
            return { ...currentMenu, query }
        })
    }

    const renderedNodes = getRenderedNodes()
    const aiWritingPlaceholderNodeIds = useMemo(() => getAIWritingPlaceholderNodeIds(document.nodes), [document.nodes])
    const focusAIPromptNodeId = useMemo(
        () => (focusAIPromptRequest === undefined ? null : getLatestEmptyAIPromptNodeId(document.nodes)),
        [document.nodes, focusAIPromptRequest]
    )
    const aiTargetedNodeIds = useMemo(() => {
        const ids = new Set<string>()
        for (const n of document.nodes) {
            if (isPromptComponentNode(n)) {
                const targetId = getNotebookStringProp(n.props.targetNodeId)
                if (targetId) ids.add(targetId)
            }
        }
        if (aiSelectionReviewRef.current?.targetNodeId) {
            ids.add(aiSelectionReviewRef.current.targetNodeId)
        }
        return ids
    }, [document.nodes])
    const showInsertBoundaries = mode === 'edit' && document.nodes.length > 0
    const placeholderNodeId = hasNotebookContent(renderedNodes) ? null : renderedNodes[0]?.id
    const insertCommands = useMemo(
        () =>
            omitInsertCommands(
                buildInsertCommands(
                    mergedRegistry,
                    replaceNodeWithInsertedComponent,
                    replaceNode,
                    (nodeId) => {
                        restoreSelectionRef.current = { nodeId, start: 0, end: 0 }
                    },
                    (nodeId) => {
                        restoreSelectionRef.current = {
                            nodeId,
                            tableCell: { section: 'header', rowIndex: 0, columnIndex: 0 },
                            start: 0,
                            end: 8,
                        }
                    },
                    (nodeId) => {
                        restoreSelectionRef.current = { nodeId, start: 0, end: 0 }
                    },
                    onAskAI ? openAIPrompt : undefined,
                    false,
                    extraInsertCommands ? extraInsertCommands(insertMenuApi) : []
                ),
                hiddenInsertCommandKeys
            ),
        [
            mergedRegistry,
            replaceNodeWithInsertedComponent,
            replaceNode,
            onAskAI,
            openAIPrompt,
            extraInsertCommands,
            hiddenInsertCommandKeys,
            insertMenuApi,
        ]
    )

    function getRenderedNodes(): NotebookBlockNode[] {
        if (document.nodes.length || mode === 'view') {
            return document.nodes
        }
        return [emptyNodeRef.current]
    }

    useEffect(() => {
        const componentNodeIds = new Set(
            document.nodes.flatMap((node): string[] => {
                if (node.type !== 'component') {
                    return []
                }
                return [node.id]
            })
        )
        const initializedComponentPanelNodeIds = initializedComponentPanelNodeIdsRef.current
        if (initializedComponentPanelNodeIds === null) {
            initializedComponentPanelNodeIdsRef.current = componentNodeIds
            return
        }

        const insertedComponentNodeIds = [...componentNodeIds].filter(
            (nodeId) => !initializedComponentPanelNodeIds.has(nodeId)
        )
        initializedComponentPanelNodeIdsRef.current = componentNodeIds
        if (mode !== 'edit' || !insertedComponentNodeIds.length) {
            return
        }

        const insertedComponentNodeIdSet = new Set(insertedComponentNodeIds)
        const nextNodes = document.nodes.map((node) => {
            if (node.type !== 'component' || !insertedComponentNodeIdSet.has(node.id)) {
                return node
            }

            const definition = getMarkdownNotebookComponentDefinition(mergedRegistry, node.tagName)
            const insertedPanels = getInsertedComponentPanelVisibility(node)
            return withPersistedComponentPanelProps(node, definition, insertedPanels)
        })
        if (areNotebookDocumentsEqual(document, { ...document, nodes: nextNodes })) {
            return
        }

        commitDocument(
            {
                ...document,
                nodes: nextNodes,
            },
            {
                addToHistory: false,
            }
        )
    }, [commitDocument, document, mergedRegistry, mode])

    const updateFloatingToolbarFromSelection = useCallback((): void => {
        clearFloatingToolbarRevealTimeout()
        const pointerAnchor = floatingToolbarPointerAnchorRef.current
        floatingToolbarPointerAnchorRef.current = null

        if (mode !== 'edit') {
            floatingToolbarPositionLockRef.current = null
            setFloatingToolbar(null)
            return
        }

        let selection: Selection | null = null
        try {
            selection = window.getSelection()
        } catch {
            floatingToolbarPositionLockRef.current = null
            setFloatingToolbar(null)
            return
        }
        if (!selection || selection.rangeCount === 0) {
            if (isFormattingToolbarFocused()) {
                return
            }
            floatingToolbarPositionLockRef.current = null
            setFloatingToolbar(null)
            return
        }

        try {
            const notebookElement = notebookRef.current
            const selectedMarkdown = notebookElement
                ? getSelectedNotebookMarkdown(
                      selection,
                      notebookElement,
                      documentRef.current.nodes,
                      blockRefs.current,
                      listItemRefs.current
                  )
                : null
            const textRanges = getSelectedTextRanges(selection, documentRef.current.nodes, blockRefs.current)
            const codeRanges = getSelectedCodeRanges(selection, documentRef.current.nodes, blockRefs.current)
            const listItemRanges = getSelectedListItemRanges(selection, documentRef.current.nodes, listItemRefs.current)
            if ((!textRanges.length && !codeRanges.length && !listItemRanges.length) || !selectedMarkdown) {
                if (isFormattingToolbarFocused()) {
                    return
                }
                floatingToolbarPositionLockRef.current = null
                setFloatingToolbar(null)
                return
            }

            if (selection.rangeCount === 0) {
                floatingToolbarPositionLockRef.current = null
                setFloatingToolbar(null)
                return
            }
            const domRange = selection.getRangeAt(0)

            const selectionRect = getSelectionClientRect(domRange)
            if (!selectionRect) {
                floatingToolbarPositionLockRef.current = null
                setFloatingToolbar(null)
                return
            }

            const firstSelectedNodeId = textRanges[0]?.node.id ?? codeRanges[0]?.node.id ?? listItemRanges[0]?.node.id
            const firstSelectedElement = firstSelectedNodeId ? blockRefs.current[firstSelectedNodeId] : null
            const lineHeight = firstSelectedElement ? getElementLineHeight(firstSelectedElement) : 24
            const vv = window.visualViewport
            const viewLeft = vv?.offsetLeft ?? 0
            const viewTop = vv?.offsetTop ?? 0
            const viewWidth = vv?.width ?? window.innerWidth
            const viewHeight = vv?.height ?? window.innerHeight
            const viewRight = viewLeft + viewWidth
            const viewBottom = viewTop + viewHeight
            const isNarrow = viewWidth < 640
            const estimatedHeight = isNarrow ? FLOATING_TOOLBAR_ESTIMATED_HEIGHT_NARROW : FLOATING_TOOLBAR_ESTIMATED_HEIGHT
            const shouldPlaceBelow = pointerAnchor
                ? pointerAnchor.placement === 'below'
                : selectionRect.top - viewTop < estimatedHeight + lineHeight
            const pointerOverlapsSelection =
                pointerAnchor && pointerAnchor.y >= selectionRect.top && pointerAnchor.y <= selectionRect.bottom
            const rawTop = pointerAnchor
                ? Math.round(
                      shouldPlaceBelow
                          ? pointerOverlapsSelection
                              ? selectionRect.bottom + FLOATING_TOOLBAR_GAP
                              : pointerAnchor.y + FLOATING_TOOLBAR_GAP
                          : pointerOverlapsSelection
                            ? selectionRect.top
                            : pointerAnchor.y
                  )
                : Math.round(shouldPlaceBelow ? selectionRect.bottom + lineHeight : selectionRect.top)
            const toolbarTop = Math.min(
                viewBottom - estimatedHeight - 8,
                Math.max(viewTop + 8, rawTop)
            )
            const toolbarLeft = pointerAnchor
                ? Math.round(pointerAnchor.x)
                : Math.round(selectionRect.left + selectionRect.width / 2)
            const lockedPosition = floatingToolbarPositionLockRef.current

            setFloatingToolbar({
                textRanges,
                codeRanges,
                listItemRanges,
                selectedMarkdown,
                placement: lockedPosition?.placement ?? (shouldPlaceBelow ? 'below' : 'above'),
                top: lockedPosition?.top ?? toolbarTop,
                left: lockedPosition?.left ?? Math.min(viewRight - 16, Math.max(viewLeft + 16, toolbarLeft)),
            })
        } catch {
            floatingToolbarPositionLockRef.current = null
            setFloatingToolbar(null)
        }
    }, [clearFloatingToolbarRevealTimeout, mode])

    const scheduleFloatingToolbarUpdateFromSelection = useCallback(
        (delayMs: number = 0): void => {
            clearFloatingToolbarRevealTimeout()
            if (delayMs <= 0) {
                floatingToolbarRevealAfterRef.current = 0
                updateFloatingToolbarFromSelection()
                return
            }

            setFloatingToolbar(null)
            floatingToolbarRevealTimeoutRef.current = window.setTimeout(() => {
                floatingToolbarRevealTimeoutRef.current = null
                updateFloatingToolbarFromSelection()
            }, delayMs)
        },
        [clearFloatingToolbarRevealTimeout, updateFloatingToolbarFromSelection]
    )

    useEffect(() => clearFloatingToolbarRevealTimeout, [clearFloatingToolbarRevealTimeout])

    const updateSelectedComponentBlocksFromSelection = useCallback((): void => {
        const nextSelectedComponentNodeIds =
            mode === 'edit'
                ? getSelectedComponentNodeIds(window.getSelection(), documentRef.current.nodes, blockRefs.current)
                : new Set<string>()

        setSelectedComponentNodeIds((currentSelectedComponentNodeIds) =>
            setsEqual(currentSelectedComponentNodeIds, nextSelectedComponentNodeIds)
                ? currentSelectedComponentNodeIds
                : nextSelectedComponentNodeIds
        )
    }, [mode])

    useEffect(() => {
        if (mode !== 'edit') {
            setFloatingToolbar(null)
            setSelectedComponentNodeIds(new Set())
            clearFloatingToolbarRevealTimeout()
            isTextSelectionPointerActiveRef.current = false
            floatingToolbarRevealAfterRef.current = 0
            return
        }

        const notebookElement = notebookRef.current
        if (!notebookElement) {
            return
        }

        const handleDocumentSelectionChange = (): void => {
            if (isTextSelectionPointerActiveRef.current) {
                setFloatingToolbar(null)
            } else {
                scheduleFloatingToolbarUpdateFromSelection(
                    Math.max(0, floatingToolbarRevealAfterRef.current - Date.now())
                )
            }
            updateSelectedComponentBlocksFromSelection()
            // Non-text blocks (queries, dividers, comments…) never produce a text caret, so
            // fall back to the focused block — collaborators still see who is on it.
            onCaretChange?.(
                getMarkdownNotebookCaretPosition(window.getSelection(), notebookElement, documentRef.current.nodes) ??
                    getFocusedBlockCaretPosition(
                        window.document.activeElement,
                        notebookElement,
                        documentRef.current.nodes,
                        blockRefs.current
                    )
            )
        }

        const handleDocumentPointerStart = (event: MouseEvent | PointerEvent | TouchEvent): void => {
            if (event.target instanceof HTMLElement && event.target.closest('.MarkdownNotebook__format-toolbar')) {
                return
            }

            floatingToolbarPositionLockRef.current = null
        }

        window.document.addEventListener('selectionchange', handleDocumentSelectionChange)
        // Focusing a non-editable block (component shell, divider, comment) doesn't fire
        // selectionchange, so focus moves must also refresh the reported caret.
        window.document.addEventListener('focusin', handleDocumentSelectionChange)
        window.document.addEventListener('mousedown', handleDocumentPointerStart, true)
        window.document.addEventListener('pointerdown', handleDocumentPointerStart, true)
        window.document.addEventListener('touchstart', handleDocumentPointerStart, true)
        window.addEventListener('resize', handleDocumentSelectionChange)
        window.addEventListener('scroll', handleDocumentSelectionChange, true)
        window.visualViewport?.addEventListener('resize', handleDocumentSelectionChange)
        window.visualViewport?.addEventListener('scroll', handleDocumentSelectionChange)

        return () => {
            window.document.removeEventListener('selectionchange', handleDocumentSelectionChange)
            window.document.removeEventListener('focusin', handleDocumentSelectionChange)
            window.document.removeEventListener('mousedown', handleDocumentPointerStart, true)
            window.document.removeEventListener('pointerdown', handleDocumentPointerStart, true)
            window.document.removeEventListener('touchstart', handleDocumentPointerStart, true)
            window.removeEventListener('resize', handleDocumentSelectionChange)
            window.removeEventListener('scroll', handleDocumentSelectionChange, true)
            window.visualViewport?.removeEventListener('resize', handleDocumentSelectionChange)
            window.visualViewport?.removeEventListener('scroll', handleDocumentSelectionChange)
        }
    }, [
        mode,
        clearFloatingToolbarRevealTimeout,
        scheduleFloatingToolbarUpdateFromSelection,
        updateSelectedComponentBlocksFromSelection,
        onCaretChange,
    ])

    const handleSelectionChange = (): void => {
        if (isTextSelectionPointerActiveRef.current) {
            clearFloatingToolbarRevealTimeout()
            setFloatingToolbar(null)
            return
        }

        scheduleFloatingToolbarUpdateFromSelection(Math.max(0, floatingToolbarRevealAfterRef.current - Date.now()))
    }

    const updateTextSelectionPointerPoint = useCallback((clientX: number, clientY: number): void => {
        const pointerState = textSelectionPointerStateRef.current
        if (!pointerState) {
            return
        }

        pointerState.lastX = clientX
        pointerState.lastY = clientY
    }, [])

    const finishTextSelectionPointer = useCallback(
        (clientX?: number, clientY?: number): void => {
            const pointerState = textSelectionPointerStateRef.current
            if (pointerState) {
                if (clientX !== undefined && clientY !== undefined) {
                    pointerState.lastX = clientX
                    pointerState.lastY = clientY
                }

                floatingToolbarPointerAnchorRef.current = {
                    x: pointerState.lastX,
                    y: pointerState.lastY,
                    placement: pointerState.lastY >= pointerState.originY ? 'below' : 'above',
                }
            }

            textSelectionPointerStateRef.current = null
            isTextSelectionPointerActiveRef.current = false
            floatingToolbarRevealAfterRef.current = Date.now() + FLOATING_TOOLBAR_REVEAL_DELAY_MS
            scheduleFloatingToolbarUpdateFromSelection(FLOATING_TOOLBAR_REVEAL_DELAY_MS)
        },
        [scheduleFloatingToolbarUpdateFromSelection]
    )

    useEffect(() => {
        if (mode !== 'edit') {
            isTextSelectionPointerActiveRef.current = false
            floatingToolbarRevealAfterRef.current = 0
            textSelectionPointerStateRef.current = null
            floatingToolbarPointerAnchorRef.current = null
            return
        }

        const handleMouseMove = (event: MouseEvent): void => {
            if (isTextSelectionPointerActiveRef.current) {
                updateTextSelectionPointerPoint(event.clientX, event.clientY)
            }
        }

        const handleMouseUp = (event: MouseEvent): void => {
            if (!isTextSelectionPointerActiveRef.current) {
                return
            }

            finishTextSelectionPointer(event.clientX, event.clientY)
        }

        const handlePointerMove = (event: PointerEvent): void => {
            if (isTextSelectionPointerActiveRef.current) {
                updateTextSelectionPointerPoint(event.clientX, event.clientY)
            }
        }

        const handlePointerEnd = (event: PointerEvent): void => {
            if (!isTextSelectionPointerActiveRef.current) {
                return
            }

            finishTextSelectionPointer(event.clientX, event.clientY)
        }

        const handleTouchMove = (event: TouchEvent): void => {
            if (!isTextSelectionPointerActiveRef.current) {
                return
            }

            const touch = event.touches[0]
            if (touch) {
                updateTextSelectionPointerPoint(touch.clientX, touch.clientY)
            }
        }

        const handleTouchEnd = (event: TouchEvent): void => {
            if (!isTextSelectionPointerActiveRef.current) {
                return
            }

            const changedTouch = event.changedTouches[0]
            finishTextSelectionPointer(changedTouch?.clientX, changedTouch?.clientY)
        }

        window.document.addEventListener('mousemove', handleMouseMove, true)
        window.document.addEventListener('mouseup', handleMouseUp)
        window.document.addEventListener('pointermove', handlePointerMove, true)
        window.document.addEventListener('pointerup', handlePointerEnd, true)
        window.document.addEventListener('pointercancel', handlePointerEnd, true)
        window.document.addEventListener('touchmove', handleTouchMove, true)
        window.document.addEventListener('touchend', handleTouchEnd, true)
        window.document.addEventListener('touchcancel', handleTouchEnd, true)

        return () => {
            window.document.removeEventListener('mousemove', handleMouseMove, true)
            window.document.removeEventListener('mouseup', handleMouseUp)
            window.document.removeEventListener('pointermove', handlePointerMove, true)
            window.document.removeEventListener('pointerup', handlePointerEnd, true)
            window.document.removeEventListener('pointercancel', handlePointerEnd, true)
            window.document.removeEventListener('touchmove', handleTouchMove, true)
            window.document.removeEventListener('touchend', handleTouchEnd, true)
            window.document.removeEventListener('touchcancel', handleTouchEnd, true)
        }
    }, [finishTextSelectionPointer, mode, updateTextSelectionPointerPoint])

    const startTextSelectionPointer = (event: TextSelectionPointerStartEvent): void => {
        if (mode !== 'edit') {
            return
        }

        const beginTextSelectionPointer = (clientX: number, clientY: number): void => {
            clearFloatingToolbarRevealTimeout()
            isTextSelectionPointerActiveRef.current = true
            floatingToolbarRevealAfterRef.current = 0
            textSelectionPointerStateRef.current = {
                originX: clientX,
                originY: clientY,
                lastX: clientX,
                lastY: clientY,
            }
            floatingToolbarPointerAnchorRef.current = null
            floatingToolbarPositionLockRef.current = null
            setFloatingToolbar(null)
        }

        if ('touches' in event) {
            if (event.touches.length !== 1) {
                return
            }

            const touch = event.touches[0]
            beginTextSelectionPointer(touch.clientX, touch.clientY)
            return
        }

        if ('pointerId' in event) {
            if (event.isPrimary === false || event.pointerType === 'touch' || event.button !== 0) {
                return
            }

            beginTextSelectionPointer(event.clientX, event.clientY)
            return
        }

        if ((window as Window & { PointerEvent?: typeof PointerEvent }).PointerEvent || event.button !== 0) {
            return
        }

        beginTextSelectionPointer(event.clientX, event.clientY)
    }

    const getCurrentSelectionInlineRanges = (): {
        textRanges: FloatingToolbarTextRange[]
        listItemRanges: FloatingToolbarListItemRange[]
    } => {
        const notebookElement = notebookRef.current
        const selection = window.getSelection()
        if (!notebookElement || !selection || selection.rangeCount === 0) {
            return { textRanges: [], listItemRanges: [] }
        }

        const range = selection.getRangeAt(0)
        if (!rangeIntersectsNode(range, notebookElement)) {
            return { textRanges: [], listItemRanges: [] }
        }

        const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
        return {
            textRanges: getSelectedTextRanges(selection, nodes, blockRefs.current),
            listItemRanges: getSelectedListItemRanges(selection, nodes, listItemRefs.current),
        }
    }

    const updateInlineSelections = (
        activeTextRanges: FloatingToolbarTextRange[] | null | undefined,
        activeListItemRanges: FloatingToolbarListItemRange[] | null | undefined,
        updater: (children: NotebookInlineNode[], range: NotebookTextSelectionRange) => NotebookInlineNode[]
    ): boolean => {
        if (!activeTextRanges?.length && !activeListItemRanges?.length) {
            return false
        }

        const rangesByNodeId = new Map(activeTextRanges?.map(({ range }) => [range.nodeId, range]) ?? [])
        const listItemRangesByNodeId = new Map<string, FloatingToolbarListItemRange[]>()
        activeListItemRanges?.forEach((listItemRange) => {
            listItemRangesByNodeId.set(listItemRange.node.id, [
                ...(listItemRangesByNodeId.get(listItemRange.node.id) ?? []),
                listItemRange,
            ])
        })
        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]

        // Restore targets must be in document order: the first and last entries bound the selection.
        restoreSelectionRef.current = {
            textRanges: nodes.flatMap((node): RestoreTextRange[] => {
                const textRange = rangesByNodeId.get(node.id)
                if (textRange) {
                    return [textRange]
                }
                return (listItemRangesByNodeId.get(node.id) ?? []).map(({ range, itemIndex }) => ({
                    ...range,
                    listItemIndex: itemIndex,
                }))
            }),
        }
        commitDocument({
            ...currentDocument,
            nodes: nodes.map((node) => {
                const range = rangesByNodeId.get(node.id)
                if (range && isTextBlockNode(node)) {
                    return {
                        ...node,
                        children: updater(node.children, range),
                    }
                }

                const listItemRanges = listItemRangesByNodeId.get(node.id)
                if (listItemRanges?.length && node.type === 'list') {
                    const rangesByItemIndex = new Map(listItemRanges.map((entry) => [entry.itemIndex, entry.range]))
                    return {
                        ...node,
                        items: node.items.map((item, itemIndex) => {
                            const itemRange = rangesByItemIndex.get(itemIndex)
                            if (!itemRange) {
                                return item
                            }
                            return { ...item, children: updater(item.children, itemRange) }
                        }),
                    }
                }

                return node
            }),
        })
        return true
    }

    const applyInlineMark = (
        markType: NotebookInlineMark['type'],
        activeRanges: {
            textRanges: FloatingToolbarTextRange[] | null | undefined
            listItemRanges: FloatingToolbarListItemRange[] | null | undefined
        } = { textRanges: floatingToolbar?.textRanges, listItemRanges: floatingToolbar?.listItemRanges }
    ): boolean => {
        const activeTextRanges = activeRanges.textRanges ?? []
        const activeListItemRanges = activeRanges.listItemRanges ?? []
        if (!activeTextRanges.length && !activeListItemRanges.length) {
            return false
        }

        if (floatingToolbar) {
            floatingToolbarPositionLockRef.current = {
                placement: floatingToolbar.placement,
                top: floatingToolbar.top,
                left: floatingToolbar.left,
            }
        }

        const currentNodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
        const currentNodesById = new Map(currentNodes.map((node) => [node.id, node]))
        const currentTextRanges = activeTextRanges.map(({ node, range }) => {
            const currentNode = currentNodesById.get(node.id)
            return {
                node: currentNode && isTextBlockNode(currentNode) ? currentNode : node,
                range,
            }
        })
        const currentListItemRanges = activeListItemRanges.map((listItemRange) => {
            const currentNode = currentNodesById.get(listItemRange.node.id)
            return {
                ...listItemRange,
                node: currentNode?.type === 'list' ? currentNode : listItemRange.node,
            }
        })
        const markSelections: InlineMarkSelection[] = [
            ...currentTextRanges.map(({ node, range }) => ({ children: node.children, range })),
            ...currentListItemRanges.map(({ node, itemIndex, range }) => ({
                children: node.items[itemIndex]?.children ?? [],
                range,
            })),
        ]
        const shouldApplyMark = !areInlineSelectionsFullyMarked(markSelections, markType)

        return updateInlineSelections(currentTextRanges, currentListItemRanges, (children, range) =>
            setInlineMark(children, range, markType, shouldApplyMark)
        )
    }

    const applyInlineLink = (href: string | null): void => {
        updateInlineSelections(floatingToolbar?.textRanges, floatingToolbar?.listItemRanges, (children, range) =>
            setInlineLinkMark(children, range, href)
        )
        floatingToolbarPositionLockRef.current = null
        setFloatingToolbar(null)
    }

    const setSelectedBlockStyle = (style: TextBlockStyle): void => {
        const activeTextRanges = floatingToolbar?.textRanges
        const activeCodeRanges = floatingToolbar?.codeRanges
        const activeListItemRanges = floatingToolbar?.listItemRanges
        if (!activeTextRanges?.length && !activeCodeRanges?.length && !activeListItemRanges?.length) {
            return
        }

        const selectedTextNodeIds = new Set(activeTextRanges?.map(({ node }) => node.id) ?? [])
        const selectedCodeNodeIds = new Set(activeCodeRanges?.map(({ node }) => node.id) ?? [])
        const selectedListNodeIds = new Set(activeListItemRanges?.map(({ node }) => node.id) ?? [])
        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]

        // The quote button toggles quote membership: unquote only when the whole selection is already quoted.
        const selectedNodes = nodes.filter(
            (node) =>
                selectedTextNodeIds.has(node.id) || selectedCodeNodeIds.has(node.id) || selectedListNodeIds.has(node.id)
        )
        const shouldUnquote =
            style === 'blockquote' && selectedNodes.length > 0 && selectedNodes.every(isGroupedBlockquoteNode)

        const inlineRangesByNodeId = new Map(
            [...(activeTextRanges ?? []), ...(activeCodeRanges ?? [])].map(({ range }) => [range.nodeId, range])
        )
        const listItemRangesByNodeId = new Map<string, FloatingToolbarListItemRange[]>()
        activeListItemRanges?.forEach((listItemRange) => {
            listItemRangesByNodeId.set(listItemRange.node.id, [
                ...(listItemRangesByNodeId.get(listItemRange.node.id) ?? []),
                listItemRange,
            ])
        })
        restoreSelectionRef.current = {
            textRanges: nodes.flatMap((node): RestoreTextRange[] => {
                const inlineRange = inlineRangesByNodeId.get(node.id)
                if (inlineRange) {
                    return [inlineRange]
                }
                return (listItemRangesByNodeId.get(node.id) ?? []).map(({ range, itemIndex }) => ({
                    ...range,
                    listItemIndex: itemIndex,
                }))
            }),
        }
        commitDocument({
            ...currentDocument,
            nodes: nodes.map((node) => {
                if (selectedCodeNodeIds.has(node.id) && node.type === 'code') {
                    if (style === 'code') {
                        return node
                    }
                    const children = plainTextToInlineNodes(node.text)
                    if (typeof style === 'number') {
                        return { id: node.id, type: 'heading', level: style, children }
                    }
                    return { id: node.id, type: style, children }
                }
                if (selectedListNodeIds.has(node.id) && node.type === 'list') {
                    // Lists only toggle blockquote membership; heading and code styles do not apply to them.
                    if (style === 'blockquote') {
                        return { ...node, blockquote: shouldUnquote ? undefined : true }
                    }
                    if (style === 'paragraph' && node.blockquote) {
                        return { ...node, blockquote: undefined }
                    }
                    return node
                }
                if (!selectedTextNodeIds.has(node.id) || !isTextBlockNode(node)) {
                    return node
                }

                if (style === 'code') {
                    return {
                        id: node.id,
                        type: 'code',
                        text: getInlineText(node.children),
                    }
                }
                if (typeof style === 'number') {
                    // A heading applied inside a quote keeps its quote membership
                    return {
                        ...node,
                        type: 'heading',
                        level: style,
                        blockquote: node.type === 'blockquote' || node.blockquote ? true : undefined,
                    }
                }
                if (style === 'blockquote') {
                    if (node.type === 'heading') {
                        // Quote membership toggles without touching the heading level
                        return { ...node, blockquote: shouldUnquote ? undefined : true }
                    }
                    if (shouldUnquote) {
                        return { ...node, type: 'paragraph', level: undefined, blockquote: undefined }
                    }
                    return { ...node, type: 'blockquote', level: undefined, blockquote: undefined }
                }
                if (style === 'paragraph' && node.type === 'heading' && node.blockquote) {
                    // Removing the heading style inside a quote downgrades to quote text, not plain text
                    return { ...node, type: 'blockquote', level: undefined, blockquote: undefined }
                }
                return { ...node, type: style, level: undefined, blockquote: undefined }
            }),
        })
    }

    const setCodeRefMark = (
        node: NotebookCodeBlockNode,
        range: NotebookTextSelectionRange,
        refId: string
    ): NotebookCodeBlockNode => ({
        ...node,
        refs: [
            ...(node.refs ?? []).filter((ref) => ref.id !== refId),
            { id: refId, start: range.start, end: Math.min(range.end, node.text.length) },
        ],
    })

    const askAIAboutSelection = (presetQuery?: string): void => {
        if (!floatingToolbar) {
            return
        }

        const selectedMarkdown = floatingToolbar.selectedMarkdown
        if (!selectedMarkdown.trim()) {
            return
        }

        const firstSelectedNodeId =
            floatingToolbar.textRanges[0]?.node.id ??
            floatingToolbar.codeRanges[0]?.node.id ??
            floatingToolbar.listItemRanges[0]?.node.id
        if (!firstSelectedNodeId) {
            return
        }

        const textRange = floatingToolbar.textRanges[0]
        const listRange = floatingToolbar.listItemRanges[0]
        openAIPrompt(firstSelectedNodeId, {
            source: 'selection',
            selectedMarkdown,
            question: presetQuery ?? '',
            autoRun: Boolean(presetQuery?.trim()),
            targetNodeId: firstSelectedNodeId,
            selectionStart: textRange?.range.start ?? listRange?.range.start,
            selectionEnd: textRange?.range.end ?? listRange?.range.end,
            listItemIndex: listRange?.itemIndex,
        })
        setFloatingToolbar(null)
    }

    // Comments need at least one anchorable range: an inline `<ref>` mark for text and list
    // selections, or a block-level `refs` anchor for selections inside code blocks.
    const canStartInlineCommentAtSelection = (): boolean => {
        if (!floatingToolbar) {
            return false
        }
        return (
            floatingToolbar.textRanges.length +
                floatingToolbar.listItemRanges.length +
                floatingToolbar.codeRanges.length >=
            1
        )
    }

    const startInlineCommentAtSelection = (): void => {
        if (!floatingToolbar || !canStartInlineCommentAtSelection()) {
            return
        }
        const textRange = floatingToolbar.textRanges[0]
        const listRange = floatingToolbar.listItemRanges[0]
        const targetNodeId = textRange?.node.id || listRange?.node.id
        if (!targetNodeId) return

        const note = actorToInlineNote('')
        const refId = createNotebookRefId()
        updateNode(
            targetNodeId,
            (current) => {
                if (textRange && isTextBlockNode(current)) {
                    return {
                        ...current,
                        children: applyRefToRange(current.children, textRange.range, refId),
                    }
                }
                if (listRange && current.type === 'list') {
                    return {
                        ...current,
                        items: current.items.map((item, itemIndex) =>
                            itemIndex === listRange.itemIndex
                                ? {
                                      ...item,
                                      children: applyRefToRange(item.children, listRange.range, refId),
                                  }
                                : item
                        ),
                    }
                }
                return current
            },
            { annotations: upsertAnnotation(documentRef.current.annotations, refId, [note]) }
        )
        floatingToolbarPositionLockRef.current = null
        setFloatingToolbar(null)
        window.getSelection()?.removeAllRanges()
        const overlay = clampOverlayPosition({
            top: floatingToolbar.top,
            bottom: floatingToolbar.top + 28,
            left: floatingToolbar.left,
        })
        setInlineNotePopover({
            nodeId: targetNodeId,
            refId,
            by: note.by,
            name: note.name,
            avatar: note.avatar,
            text: '',
            kind: 'human',
            draft: true,
            createdAt: note.createdAt,
            top: overlay.top,
            left: overlay.left,
        })
    }

    const revealInlineRefs = (refIds: string[]): void => {
        window.setTimeout(() => {
            const root = notebookRef.current
            if (!root || !refIds.length) return
            let first: HTMLElement | null = null
            for (const refId of refIds) {
                const host = root.querySelector<HTMLElement>(`[data-notebook-ref="${refId}"]`)
                if (!host) continue
                host.classList.add(
                    host.classList.contains('MarkdownNotebook__piece-note')
                        ? 'MarkdownNotebook__piece-note--flash'
                        : 'MarkdownNotebook__ref--flash'
                )
                window.setTimeout(() => {
                    host.classList.remove('MarkdownNotebook__ref--flash')
                    host.classList.remove('MarkdownNotebook__piece-note--flash')
                }, 1600)
                if (!first) first = host
            }
            first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }, 40)
    }

    const invitePhilosophersToNode = (_anchorNodeId: string, botIds: string[]): void => {
        const bots = botIds.map((id) => resolveInviteBot(id)).filter((bot): bot is NonNullable<typeof bot> => Boolean(bot))
        if (!bots.length) return

        const readable = notebookReadableText(documentRef.current.nodes)
        if (!readable.trim()) return

        const names = bots.map((bot) => bot.name)
        setInvitePicker(null)
        setInsertMenu(null)
        setInviteStatus({ names })

        void requestPhilosopherComment({ botIds: bots.map((bot) => bot.id), selection: readable })
            .then((results) => {
                const applied = applyPhilosopherInviteNotes(documentRef.current, results, bots)
                if (!applied.placed.length) {
                    setInviteStatus({ names, error: 'They read the page but left no mark.' })
                    window.setTimeout(() => setInviteStatus(null), 4000)
                    return
                }
                commitDocument(applied.document)
                setInviteStatus(null)
                revealInlineRefs(applied.placed)
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'Could not invite these philosophers.'
                setInviteStatus({ names, error: message })
                window.setTimeout(() => setInviteStatus(null), 4000)
            })
    }

    const returnFocusToEditor = (nodeId: string): void => {
        window.setTimeout(() => {
            const element = blockRefs.current[nodeId]
            if (!(element instanceof HTMLElement)) return
            element.focus({ preventScroll: true })
            const length = (element.textContent || '').length
            restoreSelection(element, length, length)
        }, 0)
    }

    const removeInlineNote = (refId: string, by?: string): void => {
        const nodeId = inlineNotePopover?.nodeId
        commitDocument(deleteNotebookAnnotation(documentRef.current, refId, by))
        setInlineNotePopover(null)
        if (nodeId) returnFocusToEditor(nodeId)
    }

    // Clicking a `<ref>` highlight scrolls its comment thread into view and flashes it.
    const focusDiscussionCommentForRef = (refId: string): void => {
        const commentNode = documentRef.current.nodes.find((node) => getDiscussionCommentRefId(node) === refId)
        const element = commentNode ? blockRefs.current[commentNode.id] : null
        if (!element) {
            return
        }

        scrollNotebookElementIntoView(element)
        element.classList.add('MarkdownNotebook__component-shell--comment-flash')
        window.setTimeout(() => element.classList.remove('MarkdownNotebook__component-shell--comment-flash'), 1600)
    }

    const focusDiscussionCommentComposer = (nodeId: string): void => {
        window.setTimeout(() => {
            const element = blockRefs.current[nodeId]
            const textarea = element?.querySelector(
                '[data-attr="notebook-discussion-comment-input"] textarea, textarea[data-attr="notebook-discussion-comment-input"]'
            )
            if (textarea instanceof HTMLTextAreaElement) {
                textarea.focus()
                textarea.setSelectionRange(textarea.value.length, textarea.value.length)
                return
            }
            element?.focus()
        }, 0)
    }

    // Links in editable blocks are pointer-inert so plain clicks place the caret; holding
    // Cmd/Ctrl re-enables them (see MarkdownNotebook.scss) so they can be opened, matching
    // the TipTap editor's link mark behavior.
    useEffect(() => {
        if (mode !== 'edit') {
            return
        }

        const setLinkModifierHeld = (isHeld: boolean): void => {
            notebookRef.current?.classList.toggle('MarkdownNotebook--link-modifier-held', isHeld)
        }
        const handleModifierKeyChange = (event: globalThis.KeyboardEvent): void =>
            setLinkModifierHeld(event.metaKey || event.ctrlKey)
        const resetLinkModifier = (): void => setLinkModifierHeld(false)

        window.addEventListener('keydown', handleModifierKeyChange)
        window.addEventListener('keyup', handleModifierKeyChange)
        window.addEventListener('blur', resetLinkModifier)
        return () => {
            window.removeEventListener('keydown', handleModifierKeyChange)
            window.removeEventListener('keyup', handleModifierKeyChange)
            window.removeEventListener('blur', resetLinkModifier)
            resetLinkModifier()
        }
    }, [mode])

    const handleCanvasClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
        if (!(event.target instanceof Element)) {
            return
        }

        const linkElement = event.target.closest('a[href]')
        if (linkElement && linkElement.closest(POINTER_INERT_LINK_CONTAINER_SELECTOR)) {
            if (event.metaKey || event.ctrlKey) {
                const href = sanitizeNotebookLinkHref(linkElement.getAttribute('href') ?? '')
                if (href) {
                    event.preventDefault()
                    window.open(href, '_blank', 'noopener')
                    return
                }
            } else {
                // While editing, a plain click only places the caret, never navigates
                event.preventDefault()
            }
        }

        const noteButton = event.target.closest<HTMLElement>('[data-note-by]')
        if (noteButton) {
            event.preventDefault()
            const host = noteButton.closest<HTMLElement>('[data-notebook-ref]')
            const hostRef = host?.getAttribute('data-notebook-ref') || ''
            const notes = getAnnotationNotes(documentRef.current.annotations, hostRef)
            const by = noteButton.getAttribute('data-note-by') || ''
            const note = notes.find((entry) => entry.by === by)
            const rect = noteButton.getBoundingClientRect()
            const nodeId =
                noteButton.closest<HTMLElement>('[data-markdown-notebook-node-id]')?.dataset.markdownNotebookNodeId || ''
            const overlay = clampOverlayPosition(rect)
            setInlineNotePopover({
                nodeId,
                refId: hostRef,
                by,
                name: note?.name || noteButton.getAttribute('data-note-name') || by,
                avatar: note?.avatar || noteButton.getAttribute('data-note-avatar') || undefined,
                text: note?.text || '',
                kind: note?.kind,
                pending: note?.pending,
                draft: note?.kind === 'human' && !note?.text,
                createdAt: note?.createdAt,
                intent: note?.intent,
                suggestion: note?.suggestion,
                scope: documentRef.current.annotations?.[hostRef]?.scope,
                resolved: documentRef.current.annotations?.[hostRef]?.resolved,
                top: overlay.top,
                left: overlay.left,
            })
            return
        }

        const refId = event.target.closest('[data-notebook-ref]')?.getAttribute('data-notebook-ref')
        if (refId) {
            const notes = getAnnotationNotes(documentRef.current.annotations, refId)
            if (notes.length) {
                const first = notes[0]
                const host = event.target.closest<HTMLElement>('[data-notebook-ref]')
                const rect = (host || event.target).getBoundingClientRect()
                const nodeId =
                    event.target.closest<HTMLElement>('[data-markdown-notebook-node-id]')?.dataset
                        .markdownNotebookNodeId || ''
                const overlay = clampOverlayPosition(rect)
                setInlineNotePopover({
                    nodeId,
                    refId,
                    by: first.by,
                    name: first.name,
                    avatar: first.avatar,
                    text: first.text,
                    kind: first.kind,
                    draft: first.kind === 'human' && !first.text,
                    createdAt: first.createdAt,
                    intent: first.intent,
                    suggestion: first.suggestion,
                    scope: documentRef.current.annotations?.[refId]?.scope,
                    resolved: documentRef.current.annotations?.[refId]?.resolved,
                    top: overlay.top,
                    left: overlay.left,
                })
                return
            }
            focusDiscussionCommentForRef(refId)
        }
    }

    const openBlockNotePopover = (
        nodeId: string,
        refId: string,
        note: {
            by: string
            name: string
            avatar?: string
            text: string
            kind?: 'human' | 'bot'
            createdAt?: string
            intent?: import('./types').NotebookNoteIntent
            suggestion?: string
        },
        draft = false
    ): void => {
        const block = blockRefs.current[nodeId]
        const rect = block?.closest('.MarkdownNotebook__row')?.getBoundingClientRect() || block?.getBoundingClientRect()
        const overlay = clampOverlayPosition(rect || { top: 40, bottom: 40, left: 16 })
        setInlineNotePopover({
            nodeId,
            refId,
            by: note.by,
            name: note.name,
            avatar: note.avatar,
            text: note.text,
            kind: note.kind,
            draft,
            createdAt: note.createdAt,
            intent: note.intent,
            suggestion: note.suggestion,
            scope: 'block',
            resolved: documentRef.current.annotations?.[refId]?.resolved,
            top: overlay.top,
            left: overlay.left,
        })
    }

    // Block comments live on `node.blockId` + sidecar. They do not wrap or underline the text.
    const startBlockCommentForNode = (nodeId: string): void => {
        const node = documentRef.current.nodes.find((entry) => entry.id === nodeId)
        if (!node || isPromptComponentNode(node)) return

        const existingId = node.blockId
        const existingNotes = existingId ? documentRef.current.annotations?.[existingId]?.notes || [] : []
        const humanDraft = existingNotes.find((entry) => entry.kind === 'human' && !entry.text)
        if (existingId && humanDraft) {
            openBlockNotePopover(nodeId, existingId, humanDraft, true)
            return
        }

        const note = actorToInlineNote('')
        const refId = existingId || createNotebookRefId()
        updateNode(
            nodeId,
            (current) => (current.blockId ? current : { ...current, blockId: refId }),
            {
                annotations: upsertAnnotation(
                    documentRef.current.annotations,
                    refId,
                    existingNotes.length ? [...existingNotes, note] : [note],
                    { scope: 'block' }
                ),
            }
        )
        openBlockNotePopover(nodeId, refId, note, true)
    }

    const runBlockMoreMenuAction = (nodeId: string, action: BlockMoreMenuAction): void => {
        setBlockMenuNodeId(null)
        if (action === 'comment') {
            startBlockCommentForNode(nodeId)
            return
        }
        if (action === 'invite') {
            insertMenuApi.openPhilosopherInvite(nodeId)
            return
        }
        if (action === 'wim-ai') {
            const targetNode = documentRef.current.nodes.find((n) => n.id === nodeId)
            if (targetNode) {
                let text = ''
                if (isTextBlockNode(targetNode)) {
                    text = getInlineText(targetNode.children)
                } else if (targetNode.type === 'code') {
                    text = getNotebookStringProp(targetNode.props.code) || ''
                } else if (targetNode.type === 'list') {
                    text = targetNode.items.map((it) => getInlineText(it.children)).join('\n')
                }

                if (text.trim()) {
                    openAIPrompt(nodeId, {
                        source: 'selection',
                        targetNodeId: nodeId,
                        selectedMarkdown: text,
                        selectionStart: 0,
                        selectionEnd: text.length,
                    })
                    return
                }
            }
            openAIPrompt(nodeId)
            return
        }
        requestFocusAfterRemovingNode(nodeId)
        deleteNodeWithRefCleanup(nodeId)
    }

    const moveBlockUp = (nodeId: string): void => {
        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const fromIndex = nodes.findIndex((node) => node.id === nodeId)
        if (fromIndex > 1) {
            moveBlockToBoundary(nodeId, fromIndex - 1)
        }
    }

    const moveBlockDown = (nodeId: string): void => {
        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const fromIndex = nodes.findIndex((node) => node.id === nodeId)
        if (fromIndex >= 1 && fromIndex < nodes.length - 1) {
            moveBlockToBoundary(nodeId, fromIndex + 2)
        }
    }

    const duplicateBlock = (nodeId: string): void => {
        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const fromIndex = nodes.findIndex((node) => node.id === nodeId)
        if (fromIndex < 0) return
        const originalNode = nodes[fromIndex]
        const duplicatedNode = {
            ...originalNode,
            id: makeEmptyParagraph(`duplicate-${originalNode.id}`).id,
        }
        const nextNodes = [...nodes]
        nextNodes.splice(fromIndex + 1, 0, duplicatedNode)
        commitDocument({ ...currentDocument, nodes: nextNodes })
    }

    const copyFloatingToolbarSelection = (): void => {
        if (!floatingToolbar?.selectedMarkdown) {
            return
        }

        copyMarkdownToNotebookClipboard(floatingToolbar.selectedMarkdown)
    }

    const closeInvitePicker = useCallback((): void => {
        setInvitePicker(null)
    }, [])

    const closeMentionPicker = useCallback((): void => {
        setMentionPicker(null)
    }, [])

    const insertMentionPerson = useCallback(
        (person: MentionPerson): void => {
            if (!mentionPicker) return
            const tokenEnd = mentionPicker.start + 1 + mentionPicker.query.length
            updateNode(mentionPicker.nodeId, (current) => {
                if (isTextBlockNode(current)) {
                    return {
                        ...current,
                        children: insertMentionMark(current.children, mentionPicker.start, tokenEnd, person),
                    }
                }
                if (current.type === 'list' && mentionPicker.listItemIndex != null) {
                    const itemIndex = mentionPicker.listItemIndex
                    return {
                        ...current,
                        items: current.items.map((item, index) =>
                            index === itemIndex
                                ? {
                                      ...item,
                                      children: insertMentionMark(item.children, mentionPicker.start, tokenEnd, person),
                                  }
                                : item
                        ),
                    }
                }
                return current
            })
            const caret = mentionPicker.start + person.label.length + 1
            restoreSelectionRef.current = {
                nodeId: mentionPicker.nodeId,
                start: caret,
                end: caret,
                listItemIndex: mentionPicker.listItemIndex,
            }
            setMentionPicker(null)
        },
        [mentionPicker, updateNode]
    )

    const openInsertMenu = (nodeId: string, query: string = ''): void => {
        onInteractionStateChange?.(true)
        setInvitePicker(null)
        setInsertMenu((currentMenu) => {
            const sameNode = currentMenu?.nodeId === nodeId
            return {
                nodeId,
                query,
                selectedIndex: sameNode && currentMenu.query === query ? currentMenu.selectedIndex : 0,
                mode: sameNode && currentMenu.mode === 'ai' ? 'ai' : 'tools',
                detached: sameNode ? currentMenu.detached : undefined,
                removeNodeOnClose: sameNode ? currentMenu.removeNodeOnClose : undefined,
                rejoinNodeIdOnClose: sameNode ? currentMenu.rejoinNodeIdOnClose : undefined,
                source: sameNode ? currentMenu.source : undefined,
            }
        })
    }

    const beginSlashInsertMenu = (
        nodeId: string,
        query: string,
        options?: { detached?: boolean }
    ): void => {
        onInteractionStateChange?.(true)
        restoreSelectionRef.current = { nodeId, start: query.length, end: query.length }
        setInsertMenu((currentMenu) => ({
            nodeId,
            query,
            selectedIndex: 0,
            mode: 'tools',
            detached: options?.detached ?? (currentMenu?.nodeId === nodeId ? currentMenu.detached : undefined),
            removeNodeOnClose: currentMenu?.nodeId === nodeId ? currentMenu.removeNodeOnClose : undefined,
            rejoinNodeIdOnClose: currentMenu?.nodeId === nodeId ? currentMenu.rejoinNodeIdOnClose : undefined,
            source: 'slash',
        }))
    }

    const openDetachedInsertMenuFromNode = useCallback(
        (nodeId: string, query: string = ''): boolean => {
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            const node = nodes[nodeIndex]
            if (nodeIndex <= 0 || !node || !isTextBlockNode(node)) {
                return false
            }

            if (!getInlineText(node.children).trim()) {
                restoreSelectionRef.current = { nodeId, start: query.length, end: query.length }
                onInteractionStateChange?.(true)
                setInsertMenu({ nodeId, query, selectedIndex: 0, mode: 'tools' })
                return true
            }

            const commandNode = makeEmptyParagraph(`slash-command-${node.id}`)
            commandNode.children = query ? [{ type: 'text', text: query }] : []
            commandNode.startsGroup = true
            restoreSelectionRef.current = { nodeId: commandNode.id, start: query.length, end: query.length }
            onInteractionStateChange?.(true)
            setInsertMenu({
                nodeId: commandNode.id,
                query,
                selectedIndex: 0,
                mode: 'tools',
                detached: true,
                removeNodeOnClose: true,
            })
            commitDocument({
                ...currentDocument,
                nodes: [...nodes.slice(0, nodeIndex + 1), commandNode, ...nodes.slice(nodeIndex + 1)],
            })
            return true
        },
        [commitDocument, onInteractionStateChange]
    )

    const clearInsertMenu = useCallback((): void => {
        setInsertMenu(null)
    }, [])

    const removeTemporaryInsertMenuNode = useCallback(
        (menu: InsertMenuState | null): void => {
            if (!menu?.removeNodeOnClose) {
                return
            }

            const currentDocument = documentRef.current
            const nodeIndex = currentDocument.nodes.findIndex((node) => node.id === menu.nodeId)
            const node = currentDocument.nodes[nodeIndex]
            if (!node || !isTextBlockNode(node)) {
                return
            }

            delete blockRefs.current[menu.nodeId]
            commitDocument(
                {
                    ...currentDocument,
                    nodes: currentDocument.nodes
                        .filter((_, index) => index !== nodeIndex)
                        .map((node) =>
                            node.id === menu.rejoinNodeIdOnClose ? { ...node, startsGroup: undefined } : node
                        ),
                },
                { addToHistory: false }
            )
        },
        [commitDocument]
    )

    const dismissInsertMenu = useCallback((): void => {
        if (insertMenu?.removeNodeOnClose) {
            removeTemporaryInsertMenuNode(insertMenu)
            setInsertMenu(null)
            return
        }

        if (insertMenu?.source === 'slash' && (insertMenu.mode === undefined || insertMenu.mode === 'tools')) {
            const currentDocument = documentRef.current
            if (insertMenu.detached) {
                const restored = mergeDetachedSlashMenuBack(
                    currentDocument.nodes,
                    insertMenu.nodeId,
                    insertMenu.query
                )
                if (restored) {
                    delete blockRefs.current[insertMenu.nodeId]
                    restoreSelectionRef.current = {
                        nodeId: restored.focus.nodeId,
                        start: restored.focus.offset,
                        end: restored.focus.offset,
                    }
                    commitDocument({ ...currentDocument, nodes: restored.nodes }, { addToHistory: false })
                    setInsertMenu(null)
                    return
                }
            }

            const node = currentDocument.nodes.find((candidate) => candidate.id === insertMenu.nodeId)
            if (node && isTextBlockNode(node)) {
                const restoredText = slashMenuRestoreText(insertMenu.query)
                commitDocument(
                    {
                        ...currentDocument,
                        nodes: currentDocument.nodes.map((candidate) =>
                            candidate.id === node.id
                                ? { ...node, children: [{ type: 'text', text: restoredText }] }
                                : candidate
                        ),
                    },
                    { addToHistory: false }
                )
                restoreSelectionRef.current = {
                    nodeId: node.id,
                    start: restoredText.length,
                    end: restoredText.length,
                }
            }
        }

        setInsertMenu(null)
    }, [commitDocument, insertMenu, removeTemporaryInsertMenuNode])

    const updateInsertMenuPosition = useCallback((): void => {
        if (!insertMenu) {
            setInsertMenuPosition(null)
            return
        }

        const anchorElement = blockRefs.current[insertMenu.nodeId]
        if (!anchorElement) {
            setInsertMenuPosition(null)
            return
        }

        setInsertMenuPosition(getInsertMenuPosition(anchorElement))
    }, [insertMenu])

    useLayoutEffect(() => {
        updateInsertMenuPosition()
    }, [document, insertMenu, updateInsertMenuPosition])

    useEffect(() => {
        if (!insertMenu) {
            setInsertMenuPosition(null)
            return
        }

        window.addEventListener('resize', updateInsertMenuPosition)
        window.addEventListener('scroll', updateInsertMenuPosition, true)
        window.visualViewport?.addEventListener('resize', updateInsertMenuPosition)
        window.visualViewport?.addEventListener('scroll', updateInsertMenuPosition)

        return () => {
            window.removeEventListener('resize', updateInsertMenuPosition)
            window.removeEventListener('scroll', updateInsertMenuPosition, true)
            window.visualViewport?.removeEventListener('resize', updateInsertMenuPosition)
            window.visualViewport?.removeEventListener('scroll', updateInsertMenuPosition)
        }
    }, [insertMenu, updateInsertMenuPosition])

    const updateInvitePickerPosition = useCallback((): void => {
        if (!invitePicker) {
            setInvitePickerPosition(null)
            return
        }

        const anchorElement = blockRefs.current[invitePicker.nodeId]
        if (!anchorElement) {
            setInvitePickerPosition(null)
            return
        }

        setInvitePickerPosition(
            getInsertMenuPosition(anchorElement, {
                width: INVITE_PICKER_WIDTH,
                maxHeight: INVITE_PICKER_MAX_HEIGHT,
                minHeight: INVITE_PICKER_MIN_HEIGHT,
            })
        )
    }, [invitePicker])

    useLayoutEffect(() => {
        updateInvitePickerPosition()
    }, [document, invitePicker, updateInvitePickerPosition])

    useEffect(() => {
        if (!invitePicker) {
            setInvitePickerPosition(null)
            return
        }

        window.addEventListener('resize', updateInvitePickerPosition)
        window.addEventListener('scroll', updateInvitePickerPosition, true)
        window.visualViewport?.addEventListener('resize', updateInvitePickerPosition)
        window.visualViewport?.addEventListener('scroll', updateInvitePickerPosition)

        return () => {
            window.removeEventListener('resize', updateInvitePickerPosition)
            window.removeEventListener('scroll', updateInvitePickerPosition, true)
            window.visualViewport?.removeEventListener('resize', updateInvitePickerPosition)
            window.visualViewport?.removeEventListener('scroll', updateInvitePickerPosition)
        }
    }, [invitePicker, updateInvitePickerPosition])

    useEffect(() => {
        if (mode !== 'edit' && invitePicker) {
            setInvitePicker(null)
        }
    }, [invitePicker, mode])

    useEffect(() => {
        if (mode !== 'edit') {
            setMentionPicker(null)
            return
        }

        const syncMentionPicker = (): void => {
            if (insertMenu || invitePicker) {
                setMentionPicker(null)
                return
            }
            if (window.document.activeElement?.closest('.MarkdownNotebook__mention-picker')) {
                return
            }
            const notebookElement = notebookRef.current
            if (!notebookElement) return
            const element = getInlineEditableElementForSelection(window.getSelection(), notebookElement)
            if (!element || element.classList.contains('MarkdownNotebook__text-block--ai-prompt')) {
                setMentionPicker(null)
                return
            }
            const nodeId = element.dataset.markdownNotebookNodeId
            const node = nodeId ? documentRef.current.nodes.find((entry) => entry.id === nodeId) : null
            if (!nodeId || !node) {
                setMentionPicker(null)
                return
            }
            let text = ''
            let listItemIndex: number | undefined
            if (isTextBlockNode(node)) {
                text = getInlineText(node.children)
            } else if (node.type === 'list') {
                const itemId = element.dataset.markdownNotebookListItemId
                const rawIndex = Number(element.dataset.markdownNotebookListItemIndex)
                listItemIndex = getListItemIndex(node.items, rawIndex, itemId)
                const item = node.items[listItemIndex]
                if (!item) {
                    setMentionPicker(null)
                    return
                }
                text = getInlineText(item.children)
            } else {
                setMentionPicker(null)
                return
            }
            const range = getSelectionRange(element, nodeId)
            const caret = range ? Math.max(range.start, range.end) : text.length
            const token = getMentionTokenAt(text, caret)
            if (!token) {
                setMentionPicker(null)
                return
            }
            setMentionPicker({ nodeId, start: token.start, query: token.query, listItemIndex })
        }

        window.document.addEventListener('selectionchange', syncMentionPicker)
        notebookRef.current?.addEventListener('keyup', syncMentionPicker)
        return () => {
            window.document.removeEventListener('selectionchange', syncMentionPicker)
            notebookRef.current?.removeEventListener('keyup', syncMentionPicker)
        }
    }, [insertMenu, invitePicker, mode])

    useEffect(() => {
        if (!insertMenu) {
            return
        }

        const closeInsertMenuOnOutsidePointerDown = (event: PointerEvent): void => {
            const target = event.target
            if (!(target instanceof Node)) {
                return
            }

            const activeBlockElement = blockRefs.current[insertMenu.nodeId]
            const activeRowElement = activeBlockElement?.closest('.MarkdownNotebook__row')
            if (activeRowElement?.contains(target)) {
                return
            }

            dismissInsertMenu()
        }

        window.document.addEventListener('pointerdown', closeInsertMenuOnOutsidePointerDown)

        return () => {
            window.document.removeEventListener('pointerdown', closeInsertMenuOnOutsidePointerDown)
        }
    }, [dismissInsertMenu, insertMenu])

    const openInsertMenuAtBoundary = (boundaryIndex: number): void => {
        if (boundaryIndex <= 0) {
            return
        }

        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes
        const insertedNode: NotebookBlockNode = {
            ...makeEmptyParagraph(`boundary-${String(boundaryIndex)}`),
            startsGroup: true,
        }
        const clampedBoundaryIndex = Math.max(1, Math.min(boundaryIndex, nodes.length))
        // The block that followed the boundary starts its own card too, or it would join the
        // inserted one instead of staying with the text it was grouped with.
        const followingNode = nodes[clampedBoundaryIndex]
        const rejoinNodeIdOnClose =
            followingNode && isTextGroupNode(followingNode) && !followingNode.startsGroup ? followingNode.id : undefined

        commitDocument({
            ...currentDocument,
            nodes: [
                ...nodes.slice(0, clampedBoundaryIndex),
                insertedNode,
                ...nodes
                    .slice(clampedBoundaryIndex)
                    .map((node) => (node.id === rejoinNodeIdOnClose ? { ...node, startsGroup: true } : node)),
            ],
        })
        restoreSelectionRef.current = { nodeId: insertedNode.id, start: 0, end: 0 }
        onInteractionStateChange?.(true)
        setInsertMenu({
            nodeId: insertedNode.id,
            query: '',
            selectedIndex: 0,
            mode: 'tools',
            detached: true,
            removeNodeOnClose: true,
            rejoinNodeIdOnClose,
        })
    }

    const insertEmptyParagraphAfterNode = useCallback(
        (nodeId: string): void => {
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            if (nodeIndex === -1) {
                return
            }

            const nextNode = nodes[nodeIndex + 1]
            if (isBlankInsertMenuButtonRow(nextNode)) {
                const nextElement = blockRefs.current[nextNode.id]
                if (nextElement) {
                    nextElement.focus()
                    restoreSelection(nextElement, 0, 0)
                    return
                }
                restoreSelectionRef.current = { nodeId: nextNode.id, start: 0, end: 0 }
                return
            }

            const insertedNode = makeEmptyParagraph(`after-${nodeId}`)
            commitDocument({
                ...currentDocument,
                nodes: [...nodes.slice(0, nodeIndex + 1), insertedNode, ...nodes.slice(nodeIndex + 1)],
            })
            restoreSelectionRef.current = { nodeId: insertedNode.id, start: 0, end: 0 }
        },
        [commitDocument]
    )

    const focusLowestNotebookRow = useCallback((): boolean => {
        const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
        for (let nodeIndex = nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
            const node = nodes[nodeIndex]

            if (isTextBlockNode(node)) {
                const element = blockRefs.current[node.id]
                if (!element) {
                    continue
                }

                const targetOffset = getInlineText(node.children).length
                element.focus()
                restoreSelection(element, targetOffset, targetOffset)
                return true
            }

            if (node.type === 'list') {
                const itemIndex = node.items.length - 1
                if (itemIndex < 0) {
                    continue
                }

                const element = listItemRefs.current[getListItemRefKey(node.id, itemIndex)]
                if (!element) {
                    continue
                }

                const targetOffset = getInlineText(node.items[itemIndex].children).length
                element.focus()
                restoreSelection(element, targetOffset, targetOffset)
                return true
            }

            if (node.type === 'table') {
                const position = getTableEdgeCellPosition(node, 'previous')
                const element = position ? tableCellRefs.current[getTableCellRefKey(node.id, position)] : null
                if (!position || !element) {
                    continue
                }

                const targetOffset = getInlineText(getTableCellAtPosition(node, position)?.children ?? []).length
                element.focus()
                restoreSelection(element, targetOffset, targetOffset)
                return true
            }

            if (node.type === 'component') {
                const element = blockRefs.current[node.id]
                if (!element) {
                    continue
                }

                element.focus()
                return true
            }
        }

        return false
    }, [insertMenu])

    const requestFocusForNode = useCallback((node: NotebookBlockNode, placement: 'start' | 'end'): boolean => {
        const offsetForChildren = (children: NotebookInlineNode[]): number =>
            placement === 'start' ? 0 : getInlineText(children).length

        if (isTextBlockNode(node)) {
            const offset = offsetForChildren(node.children)
            restoreSelectionRef.current = { nodeId: node.id, start: offset, end: offset }
            return true
        }

        if (node.type === 'component') {
            focusNodeRef.current = node.id
            return true
        }

        if (node.type === 'list' && node.items.length) {
            const listItemIndex = placement === 'start' ? 0 : node.items.length - 1
            const offset = offsetForChildren(node.items[listItemIndex].children)
            restoreSelectionRef.current = {
                nodeId: node.id,
                listItemIndex,
                listItemId: node.items[listItemIndex].id,
                start: offset,
                end: offset,
            }
            return true
        }

        if (node.type === 'table') {
            const tableCell = getTableEdgeCellPosition(node, placement === 'start' ? 'next' : 'previous')
            if (!tableCell) {
                return false
            }

            const offset = offsetForChildren(getTableCellAtPosition(node, tableCell)?.children ?? [])
            restoreSelectionRef.current = { nodeId: node.id, tableCell, start: offset, end: offset }
            return true
        }

        return false
    }, [])

    const requestFocusAfterRemovingNode = useCallback(
        (nodeId: string): void => {
            const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            if (nodeIndex === -1) {
                return
            }

            const nextNode = nodes[nodeIndex + 1]
            if (nextNode && requestFocusForNode(nextNode, 'start')) {
                return
            }

            const previousNode = nodes[nodeIndex - 1]
            if (previousNode && requestFocusForNode(previousNode, 'end')) {
                return
            }

            restoreSelectionRef.current = { nodeId: emptyNodeRef.current.id, start: 0, end: 0 }
        },
        [requestFocusForNode]
    )

    const deleteEmptyCodeBlockAtCurrentSelection = useCallback((): boolean => {
        const element = getSelectedInlineEditableElementOfType(notebookRef.current, 'MarkdownNotebook__code-block')
        const nodeId = element?.dataset.markdownNotebookNodeId
        if (!element || !nodeId) {
            return false
        }

        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const node = nodes.find((currentNode) => currentNode.id === nodeId)
        if (!node || node.type !== 'code' || node.text.length) {
            return false
        }

        requestFocusAfterRemovingNode(nodeId)
        commitDocument({
            ...currentDocument,
            nodes: nodes.filter((currentNode) => currentNode.id !== nodeId),
        })
        return true
    }, [commitDocument, requestFocusAfterRemovingNode])

    const insertParagraphBelowTrailingCodeBlockAtCurrentSelection = useCallback((): boolean => {
        const element = getSelectedInlineEditableElementOfType(notebookRef.current, 'MarkdownNotebook__code-block')
        const nodeId = element?.dataset.markdownNotebookNodeId
        if (!element || !nodeId) {
            return false
        }

        const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
        const nodeIndex = nodes.findIndex((currentNode) => currentNode.id === nodeId)
        const node = nodes[nodeIndex]
        if (!node || node.type !== 'code' || nodeIndex !== nodes.length - 1) {
            return false
        }

        const range = getCollapsedSelectionRange(element, nodeId)
        if (!range || range.end < node.text.lastIndexOf('\n') + 1) {
            return false
        }

        insertEmptyParagraphAfterNode(nodeId)
        return true
    }, [insertEmptyParagraphAfterNode])

    const deleteNodeAndFocusPrevious = useCallback(
        (nodeId: string): boolean => {
            const currentDocument = documentRef.current
            const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            if (nodeIndex <= 0) {
                return false
            }

            const previousNode = nodes[nodeIndex - 1]
            if (!previousNode || !requestFocusForNode(previousNode, 'end')) {
                return false
            }

            commitDocument({
                ...currentDocument,
                nodes: nodes.filter((_, index) => index !== nodeIndex),
            })
            return true
        },
        [commitDocument, requestFocusForNode]
    )

    const focusPreviousNodeAtBoundaryEnd = useCallback(
        (boundaryIndex: number): void => {
            const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
            const previousNode = nodes[boundaryIndex - 1]
            if (!previousNode) {
                return
            }

            if (isTextBlockNode(previousNode)) {
                const element = blockRefs.current[previousNode.id]
                if (!element) {
                    return
                }

                const endOffset = getInlineText(previousNode.children).length
                element.focus()
                restoreSelection(element, endOffset, endOffset)
                return
            }

            requestFocusForNode(previousNode, 'end')
        },
        [requestFocusForNode]
    )

    const moveFocusToAdjacentNode = useCallback(
        (nodeId: string, direction: InsertMenuSelectionDirection, offset: number): boolean => {
            const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            if (nodeIndex === -1) {
                return false
            }

            const step = direction === 'next' ? 1 : -1
            let targetIndex = nodeIndex + step
            while (targetIndex >= 0 && targetIndex < nodes.length) {
                const targetNode = nodes[targetIndex]
                if (isTextBlockNode(targetNode)) {
                    const element = blockRefs.current[targetNode.id]
                    if (!element) {
                        return false
                    }

                    const targetOffset = Math.min(offset, getInlineText(targetNode.children).length)
                    element.focus()
                    restoreSelection(element, targetOffset, targetOffset)
                    return true
                }

                if (targetNode.type === 'component') {
                    const element = blockRefs.current[targetNode.id]
                    if (!element) {
                        return false
                    }

                    element.focus()
                    return true
                }

                if (targetNode.type === 'list') {
                    const targetItemIndex = direction === 'next' ? 0 : targetNode.items.length - 1
                    const element = listItemRefs.current[getListItemRefKey(targetNode.id, targetItemIndex)]
                    if (!element) {
                        return false
                    }

                    const targetOffset = Math.min(
                        offset,
                        getInlineText(targetNode.items[targetItemIndex].children).length
                    )
                    element.focus()
                    restoreSelection(element, targetOffset, targetOffset)
                    return true
                }

                if (targetNode.type === 'table') {
                    const targetCellPosition = getTableEdgeCellPosition(targetNode, direction)
                    if (!targetCellPosition) {
                        return false
                    }

                    const element = tableCellRefs.current[getTableCellRefKey(targetNode.id, targetCellPosition)]
                    if (!element) {
                        return false
                    }

                    const targetOffset = Math.min(
                        offset,
                        getInlineText(getTableCellAtPosition(targetNode, targetCellPosition)?.children ?? []).length
                    )
                    element.focus()
                    restoreSelection(element, targetOffset, targetOffset)
                    return true
                }

                targetIndex += step
            }

            return false
        },
        []
    )

    const moveFocusToAdjacentTableCell = useCallback(
        (
            nodeId: string,
            position: TableCellPosition,
            direction: InsertMenuSelectionDirection,
            offset: number
        ): boolean => {
            const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
            const node = nodes.find(
                (candidate): candidate is NotebookTableBlockNode =>
                    candidate.id === nodeId && candidate.type === 'table'
            )
            if (!node) {
                return false
            }

            const positions = getTableCellPositions(node)
            const currentIndex = positions.findIndex((candidate) => tableCellPositionsEqual(candidate, position))
            if (currentIndex === -1) {
                return false
            }

            const nextPosition = positions[currentIndex + (direction === 'next' ? 1 : -1)]
            if (!nextPosition) {
                return moveFocusToAdjacentNode(nodeId, direction, offset)
            }

            const element = tableCellRefs.current[getTableCellRefKey(nodeId, nextPosition)]
            if (!element) {
                return false
            }

            const targetOffset = Math.min(
                offset,
                getInlineText(getTableCellAtPosition(node, nextPosition)?.children ?? []).length
            )
            element.focus()
            restoreSelection(element, targetOffset, targetOffset)
            return true
        },
        [moveFocusToAdjacentNode]
    )

    const moveTableCellFocusAtCurrentSelection = useCallback(
        (direction: InsertMenuSelectionDirection): boolean => {
            const element = getSelectedInlineEditableElementOfType(
                notebookRef.current,
                'MarkdownNotebook__table-cell-content'
            )
            const position = element ? getTableCellPositionFromElement(element) : null
            const nodeId = element?.dataset.markdownNotebookNodeId
            if (!element || !position || !nodeId) {
                return false
            }

            const offset = getCollapsedSelectionRange(element, nodeId)?.start ?? 0
            moveFocusToAdjacentTableCell(nodeId, position, direction, offset)
            return true
        },
        [moveFocusToAdjacentTableCell]
    )

    const indentCodeBlockAtCurrentSelection = useCallback((): boolean => {
        const element = getSelectedInlineEditableElementOfType(notebookRef.current, 'MarkdownNotebook__code-block')
        const nodeId = element?.dataset.markdownNotebookNodeId
        if (!element || !nodeId) {
            return false
        }

        window.document.execCommand('insertText', false, '    ')
        updateNode(nodeId, (currentNode) => {
            if (currentNode.type !== 'code') {
                return currentNode
            }
            return updateNotebookCodeBlockText(currentNode, element.textContent ?? '')
        })
        return true
    }, [updateNode])

    const handleMainMouseDown = (event: ReactMouseEvent<HTMLDivElement>): void => {
        if (mode !== 'edit' || event.button !== 0 || event.defaultPrevented) {
            return
        }

        if (!(event.target instanceof HTMLElement)) {
            return
        }

        if (
            event.target.closest(
                '.MarkdownNotebook__row, .MarkdownNotebook__insert-boundary, .MarkdownNotebook__insert-menu, .MarkdownNotebook__invite-picker, .MarkdownNotebook__format-toolbar, button, a, input, textarea, select, [role="button"], [contenteditable="true"]'
            )
        ) {
            return
        }

        const canvasElement = canvasRef.current
        const clickedInsideCanvas = canvasElement?.contains(event.target) ?? false
        const clickedBelowCanvas = canvasElement ? event.clientY >= canvasElement.getBoundingClientRect().bottom : true
        if (!clickedInsideCanvas && !clickedBelowCanvas) {
            return
        }

        if (focusLowestNotebookRow()) {
            event.preventDefault()
        }
    }

    const updateActiveBoundaryFromRow = (event: ReactMouseEvent<HTMLElement>, rowIndex: number): void => {
        setActiveRowIndex(rowIndex)

        if (focusedRowIndex !== null || insertMenu) {
            setActiveBoundaryIndex(null)
            return
        }

        setActiveBoundaryIndex(getClosestInsertBoundaryIndex(event.currentTarget, rowIndex, event.clientY))
    }

    const handleRowFocus = (rowIndex: number): void => {
        setActiveRowIndex(rowIndex)
        setActiveBoundaryIndex(null)
        setFocusedRowIndex(rowIndex)
    }

    const handleRowBlur = (event: ReactFocusEvent<HTMLDivElement>, rowIndex: number): void => {
        const nextTarget = event.relatedTarget
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
            return
        }

        setFocusedRowIndex((currentRowIndex) => (currentRowIndex === rowIndex ? null : currentRowIndex))
    }

    const handleCanvasMouseLeave = (): void => {
        setActiveRowIndex(null)
        setActiveBoundaryIndex(null)
    }

    const clearBlockDragState = (): void => {
        blockDragNodeIdRef.current = null
        setDraggingNodeId(null)
        setDropBoundaryIndex(null)
    }

    const getDropBoundaryIndexFromPointer = (clientY: number): number => {
        let boundaryIndex = renderedNodes.length
        for (let index = 0; index < renderedNodes.length; index++) {
            const node = renderedNodes[index]
            // Margin comments render as zero-height rows anchored elsewhere — not drop positions.
            if (isDiscussionCommentNode(node)) {
                continue
            }

            const blockElement = blockRefs.current[node.id]
            const rowElement = blockElement?.closest('.MarkdownNotebook__row') ?? blockElement
            if (!rowElement) {
                continue
            }

            const rect = rowElement.getBoundingClientRect()
            if (clientY < rect.top + rect.height / 2) {
                boundaryIndex = index
                break
            }
        }
        // The title block always stays first: nothing may drop before it.
        return Math.max(1, Math.min(boundaryIndex, renderedNodes.length))
    }

    const moveBlockToBoundary = (nodeId: string, boundaryIndex: number): void => {
        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const fromIndex = nodes.findIndex((node) => node.id === nodeId)
        if (fromIndex <= 0) {
            return
        }

        const clampedBoundaryIndex = Math.max(1, Math.min(boundaryIndex, nodes.length))
        if (clampedBoundaryIndex === fromIndex || clampedBoundaryIndex === fromIndex + 1) {
            return
        }

        const nextNodes = [...nodes]
        const [movedNode] = nextNodes.splice(fromIndex, 1)
        nextNodes.splice(
            clampedBoundaryIndex > fromIndex ? clampedBoundaryIndex - 1 : clampedBoundaryIndex,
            0,
            movedNode
        )
        commitDocument({ ...currentDocument, nodes: nextNodes })
    }

    const handleBlockDragStart = (event: ReactDragEvent<HTMLDivElement>, nodeId: string): void => {
        event.stopPropagation()
        blockDragNodeIdRef.current = nodeId
        setDraggingNodeId(nodeId)
        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', nodeId)
            event.dataTransfer.effectAllowed = 'move'
            const rowElement = blockRefs.current[nodeId]?.closest('.MarkdownNotebook__row')
            if (rowElement instanceof HTMLElement && typeof event.dataTransfer.setDragImage === 'function') {
                event.dataTransfer.setDragImage(rowElement, 0, rowElement.getBoundingClientRect().height / 2)
            }
        }
    }

    const handleBlockDragEnd = (): void => {
        clearBlockDragState()
    }

    // Drags carrying an app resource (custom `node` type), files, or a URL are treated as external
    // inserts. URL drags only count when the drag started outside this editor — dragging a link
    // (or linked text) within the notebook stays on the browser's native contentEditable handling.
    const isExternalNotebookDrag = (dataTransfer: DataTransfer | null): boolean =>
        !!dataTransfer &&
        (dataTransfer.types.includes('node') ||
            dataTransfer.types.includes('Files') ||
            (dataTransfer.types.includes('text/uri-list') && !canvasDragOriginRef.current))

    const acceptsExternalDrag = (event: ReactDragEvent<HTMLDivElement>): boolean =>
        mode === 'edit' && !!convertExternalDataTransferToNodes && isExternalNotebookDrag(event.dataTransfer)

    const clearExternalDragState = (): void => {
        setIsExternalDragOver(false)
        setDropBoundaryIndex(null)
    }

    const insertExternalNodesAtBoundary = (insertedNodes: NotebookBlockNode[], boundaryIndex: number): void => {
        if (!insertedNodes.length) {
            return
        }

        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        // The title block always stays first: nothing may drop before it.
        const clampedBoundaryIndex = Math.max(1, Math.min(boundaryIndex, nodes.length))
        insertedNodes.forEach((node) => markNotebookNodeFreshlyInserted(node.id))
        commitDocument({
            ...currentDocument,
            nodes: [...nodes.slice(0, clampedBoundaryIndex), ...insertedNodes, ...nodes.slice(clampedBoundaryIndex)],
        })
    }

    const {
        copyMarkdownToNotebookClipboard,
        pasteNotebookClipboardAfterNode,
        handleCopy,
        handleCut,
        handleNotebookPaste,
    } = useNotebookClipboard({
        mode,
        documentRef,
        notebookElementRef: notebookRef,
        blockRefs,
        listItemRefs,
        emptyNodeRef,
        convertExternalDataTransferToNodes,
        insertMarkdownAfterNode,
        insertExternalNodesAtBoundary,
        deleteSelectedNotebookBlocks,
        deleteListItemRangeAtCurrentSelection,
        deleteTextAtCurrentSelection,
        requestFocusAfterRemovingNode,
        updateNode,
    })

    const { handleNotebookKeyDown } = useNotebookKeyboard({
        mode,
        insertMenu,
        documentRef,
        notebookElementRef: notebookRef,
        canvasRef,
        blockRefs,
        emptyNodeRef,
        undoHistory,
        redoHistory,
        copyMarkdownToNotebookClipboard,
        pasteNotebookClipboardAfterNode,
        applyInlineMark,
        getCurrentSelectionInlineRanges,
        setSelectedComponentNodeIds,
        scheduleFloatingToolbarUpdateFromSelection,
        deleteListItemAtCurrentSelection,
        deleteListItemRangeAtCurrentSelection,
        deleteSelectedNotebookBlocks,
        deleteTextAtCurrentSelection,
        insertNewlineInCodeBlockAtCurrentSelection,
        insertTableRowAtCurrentSelection,
        splitListItemAtCurrentSelection,
        splitTextBlockAtCurrentSelection,
        startInsertMenuAtCurrentTextSelection,
    })

    const handleCanvasDragOver = (event: ReactDragEvent<HTMLDivElement>): void => {
        if (!blockDragNodeIdRef.current) {
            if (!acceptsExternalDrag(event)) {
                return
            }

            event.preventDefault()
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy'
            }
            setIsExternalDragOver(true)
            setDropBoundaryIndex(getDropBoundaryIndexFromPointer(event.clientY))
            return
        }

        // preventDefault both allows dropping and suppresses the contentEditable native text drag.
        event.preventDefault()
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move'
        }
        setDropBoundaryIndex(getDropBoundaryIndexFromPointer(event.clientY))
    }

    const handleCanvasDrop = (event: ReactDragEvent<HTMLDivElement>): void => {
        const nodeId = blockDragNodeIdRef.current
        if (!nodeId) {
            if (!acceptsExternalDrag(event) || !event.dataTransfer) {
                return
            }

            event.preventDefault()
            const boundaryIndex = getDropBoundaryIndexFromPointer(event.clientY)
            clearExternalDragState()
            const result = convertExternalDataTransferToNodes?.(event.dataTransfer)
            if (!result) {
                return
            }
            if (result instanceof Promise) {
                void result.then((insertedNodes) => {
                    if (insertedNodes?.length) {
                        insertExternalNodesAtBoundary(insertedNodes, boundaryIndex)
                    }
                })
                return
            }
            insertExternalNodesAtBoundary(result, boundaryIndex)
            return
        }

        event.preventDefault()
        const boundaryIndex = getDropBoundaryIndexFromPointer(event.clientY)
        clearBlockDragState()
        moveBlockToBoundary(nodeId, boundaryIndex)
    }

    const handleCanvasDragLeave = (event: ReactDragEvent<HTMLDivElement>): void => {
        if (!blockDragNodeIdRef.current && !isExternalDragOver) {
            return
        }

        const nextTarget = event.relatedTarget
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
            return
        }
        setIsExternalDragOver(false)
        setDropBoundaryIndex(null)
    }

    const handleRootEditableInput = (event: FormEvent<HTMLDivElement>): void => {
        if (event.target !== event.currentTarget) {
            return
        }

        const inlineEditableElement = getInlineEditableElementForSelection(window.getSelection(), event.currentTarget)
        if (!inlineEditableElement) {
            return
        }

        const nodeId = inlineEditableElement.dataset.markdownNotebookNodeId
        if (!nodeId) {
            return
        }
        const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]

        if (inlineEditableElement.classList.contains('MarkdownNotebook__code-block')) {
            updateNode(nodeId, (currentNode) => {
                if (currentNode.type !== 'code') {
                    return currentNode
                }
                return updateNotebookCodeBlockText(currentNode, inlineEditableElement.textContent ?? '')
            })
            return
        }

        const nextChildren = htmlElementToInlineNodes(inlineEditableElement)
        if (inlineEditableElement.classList.contains('MarkdownNotebook__text-block')) {
            const nodeIndex = nodes.findIndex((node) => node.id === nodeId)
            const node = nodes[nodeIndex]
            const nextText = getInlineText(nextChildren)
            const slashQuery = getSlashCommandQuery(nextText)
            if (node && isPromptComponentNode(node)) {
                rootEditableInputHtmlByNodeIdRef.current[nodeId] = inlineNodesToHtml(nextChildren, documentRef.current.annotations)
                if (getNotebookStringProp(node.props.question) !== nextText) {
                    updateNode(nodeId, (currentNode) => {
                        if (!isPromptComponentNode(currentNode)) {
                            return currentNode
                        }
                        return {
                            ...currentNode,
                            props: {
                                ...currentNode.props,
                                question: nextText,
                            },
                        }
                    })
                }
                updateAIPromptQuery(nodeId, nextText)
                return
            }
            if (node && isTextBlockNode(node)) {
                const shortcutReplacement = getTextBlockShortcutReplacement(node, nodeIndex === 0, nextText)
                if (shortcutReplacement) {
                    clearInsertMenu()
                    rootEditableInputHtmlByNodeIdRef.current[nodeId] = ''
                    replaceNodeWithNodes(nodeId, shortcutReplacement.nodes)
                    restoreSelectionRef.current = shortcutReplacement.restoreSelection
                    return
                }
            }
            if (node && isTextBlockNode(node) && insertMenu?.nodeId !== nodeId && nodeIndex > 0) {
                const caret = getCollapsedSelectionRange(inlineEditableElement, nodeId)?.end ?? nextText.length
                const slashToken = getSlashTokenAt(nextText, caret)
                if (slashToken) {
                    if (slashToken.start === 0 && slashQuery !== null) {
                        const queryChildren: NotebookInlineNode[] = slashQuery ? [{ type: 'text', text: slashQuery }] : []
                        const nextHtml = inlineNodesToHtml(queryChildren, documentRef.current.annotations)
                        rootEditableInputHtmlByNodeIdRef.current[nodeId] = nextHtml
                        if (inlineEditableElement.innerHTML !== nextHtml) {
                            inlineEditableElement.innerHTML = nextHtml
                        }
                        restoreSelection(
                            inlineEditableElement,
                            getInlineText(queryChildren).length,
                            getInlineText(queryChildren).length
                        )
                        updateNode(nodeId, (currentNode) => {
                            if (!isTextBlockNode(currentNode)) {
                                return currentNode
                            }
                            return { ...currentNode, children: queryChildren }
                        })
                        beginSlashInsertMenu(nodeId, slashQuery)
                        return
                    }

                    const parts = splitTextBlockAtSlashToken(node, nextChildren, slashToken)
                    beginSlashInsertMenu(parts.command.id, slashToken.query, { detached: true })
                    replaceNodeWithNodes(nodeId, collectSlashSplitNodes(parts))
                    return
                }
            }

            rootEditableInputHtmlByNodeIdRef.current[nodeId] = inlineNodesToHtml(nextChildren, documentRef.current.annotations)
            updateNode(nodeId, (currentNode) => {
                if (!isTextBlockNode(currentNode)) {
                    return currentNode
                }
                return { ...currentNode, children: nextChildren }
            })
            if (insertMenu?.nodeId === nodeId && insertMenu.mode === 'tools') {
                openInsertMenu(nodeId, nextText)
            } else if (insertMenu?.nodeId === nodeId && insertMenu.mode === 'ai') {
                updateAIPromptQuery(nodeId, nextText)
            }
            return
        }

        if (inlineEditableElement.classList.contains('MarkdownNotebook__list-item-content')) {
            const itemId = inlineEditableElement.dataset.markdownNotebookListItemId
            const itemIndex = Number(inlineEditableElement.dataset.markdownNotebookListItemIndex)
            if (!Number.isInteger(itemIndex)) {
                return
            }

            const listNode = nodes.find((node) => node.id === nodeId)
            if (listNode?.type === 'list' && insertMenu?.nodeId !== nodeId) {
                const caret = getCollapsedSelectionRange(inlineEditableElement, nodeId)?.end ?? nextText.length
                const slashToken = getSlashTokenAt(nextText, caret)
                if (slashToken) {
                    const targetItemIndex = getListItemIndex(listNode.items, itemIndex, itemId)
                    if (listNode.items[targetItemIndex]) {
                        const { replacementNodes, commandNodeId } = splitListItemAtSlashToken(
                            listNode,
                            targetItemIndex,
                            nextChildren,
                            slashToken
                        )
                        beginSlashInsertMenu(commandNodeId, slashToken.query, { detached: true })
                        replaceNodeWithNodes(nodeId, replacementNodes)
                        return
                    }
                }
            }
            let taskShortcut: ReturnType<typeof getTaskItemShortcut> = null
            if (listNode?.type === 'list') {
                const item = listNode.items[getListItemIndex(listNode.items, itemIndex, itemId)]
                if (item && item.checked === undefined && !(item.ordered ?? listNode.ordered)) {
                    taskShortcut = getTaskItemShortcut(nextChildren)
                }
            }
            if (taskShortcut) {
                const caretOffset = Math.max(
                    0,
                    (getCollapsedSelectionRange(inlineEditableElement, nodeId)?.start ?? taskShortcut.markerLength) -
                        taskShortcut.markerLength
                )
                restoreSelectionRef.current = {
                    nodeId,
                    listItemIndex: itemIndex,
                    listItemId: itemId,
                    start: caretOffset,
                    end: caretOffset,
                }
            }

            updateNode(nodeId, (currentNode) => {
                if (currentNode.type !== 'list') {
                    return currentNode
                }
                const targetItemIndex = getListItemIndex(currentNode.items, itemIndex, itemId)
                if (!currentNode.items[targetItemIndex]) {
                    return currentNode
                }
                return {
                    ...currentNode,
                    items: currentNode.items.map((item, index) =>
                        index === targetItemIndex
                            ? taskShortcut
                                ? { ...item, checked: taskShortcut.checked, children: taskShortcut.children }
                                : { ...item, children: nextChildren }
                            : item
                    ),
                }
            })
            return
        }

        if (inlineEditableElement.classList.contains('MarkdownNotebook__table-cell-content')) {
            const section = inlineEditableElement.dataset.markdownNotebookTableSection
            const rowIndex = Number(inlineEditableElement.dataset.markdownNotebookTableRowIndex)
            const columnIndex = Number(inlineEditableElement.dataset.markdownNotebookTableColumnIndex)
            if (
                (section !== 'header' && section !== 'body') ||
                !Number.isInteger(rowIndex) ||
                !Number.isInteger(columnIndex)
            ) {
                return
            }

            updateNode(nodeId, (currentNode) => {
                if (currentNode.type !== 'table') {
                    return currentNode
                }

                const columnCount = getTableColumnCount(currentNode)
                if (section === 'header') {
                    const nextHeaders = normalizeTableRow(currentNode.headers, columnCount)
                    nextHeaders[columnIndex] = { children: nextChildren }
                    return { ...currentNode, headers: nextHeaders }
                }

                const nextRows = currentNode.rows.map((row) => normalizeTableRow(row, columnCount))
                const nextRow = nextRows[rowIndex] ?? makeEmptyTableRow(columnCount)
                nextRow[columnIndex] = { children: nextChildren }
                nextRows[rowIndex] = nextRow
                return { ...currentNode, rows: nextRows }
            })
        }
    }

    const submitInsertMenuSelectionForNode = (nodeId: string, queryOverride?: string): boolean => {
        const isToolInsertMenuOpen =
            insertMenu?.nodeId === nodeId && (insertMenu.mode === undefined || insertMenu.mode === 'tools')
        if (!isToolInsertMenuOpen) {
            return false
        }

        const query = queryOverride ?? insertMenu.query
        const filteredCommands = getFilteredInsertCommands(insertCommands, query)
        const selectedIndex =
            query === insertMenu.query
                ? getClampedInsertMenuSelectedIndex(insertMenu.selectedIndex, filteredCommands.length)
                : 0
        const selectedCommand = filteredCommands[selectedIndex]
        if (!selectedCommand) {
            if (query.length > 0) {
                updateNode(nodeId, (currentNode) => {
                    if (!isTextBlockNode(currentNode)) {
                        return currentNode
                    }
                    return { ...currentNode, children: [] }
                })
                restoreSelectionRef.current = { nodeId, start: 0, end: 0 }
                setInsertMenu((currentMenu) => ({
                    nodeId,
                    query: '',
                    selectedIndex: 0,
                    mode: 'tools',
                    detached: currentMenu?.nodeId === nodeId ? currentMenu.detached : undefined,
                    removeNodeOnClose: currentMenu?.nodeId === nodeId ? currentMenu.removeNodeOnClose : undefined,
                }))
                return true
            }
            return false
        }
        if (selectedCommand.disabled) {
            return true
        }

        selectedCommand.run(nodeId)
        if (selectedCommand.closeOnRun === false) {
            return true
        }
        if (selectedCommand.key.startsWith('text-')) {
            updateNode(nodeId, (currentNode) => {
                if (!isTextBlockNode(currentNode)) {
                    return currentNode
                }
                return { ...currentNode, children: [] }
            })
            restoreSelectionRef.current = { nodeId, start: 0, end: 0 }
        }
        clearInsertMenu()
        return true
    }

    const submitAIPromptForNode = (nodeId: string, queryOverride?: string): boolean => {
        if (isAIPromptSubmitDisabled) {
            return false
        }

        const activeAIPromptMenu = insertMenu?.nodeId === nodeId && insertMenu.mode === 'ai' ? insertMenu : null
        const currentDocument = documentRef.current
        const nodes = currentDocument.nodes.length ? currentDocument.nodes : [emptyNodeRef.current]
        const currentPromptNode = nodes.find(
            (currentNode): currentNode is NotebookComponentBlockNode =>
                currentNode.id === nodeId && isPromptComponentNode(currentNode)
        )
        if ((!activeAIPromptMenu && !currentPromptNode) || !onAskAI) {
            return false
        }

        const query = (
            queryOverride ??
            activeAIPromptMenu?.query ??
            getNotebookStringProp(currentPromptNode?.props.question) ??
            ''
        ).trim()
        if (!query) {
            return false
        }

        const source = activeAIPromptMenu?.source ?? getPromptSource(currentPromptNode?.props.source)
        const selectedMarkdown =
            activeAIPromptMenu?.selectedMarkdown ?? getNotebookStringProp(currentPromptNode?.props.selectedMarkdown)
        const selectedRefId = activeAIPromptMenu?.selectedRefId ?? getNotebookStringProp(currentPromptNode?.props.ref)
        const isInlineSelection = source === 'selection' && Boolean(selectedMarkdown?.trim())

        let responseNodeIndex = -1
        let nextDocument: NotebookDocument
        if (isInlineSelection && currentPromptNode) {
            const targetNodeId =
                getNotebookStringProp(currentPromptNode.props.targetNodeId) ||
                nodes[nodes.findIndex((item) => item.id === nodeId) - 1]?.id ||
                ''
            const selectionStart = getNotebookNumberProp(currentPromptNode.props.selectionStart) ?? 0
            const selectionEnd =
                getNotebookNumberProp(currentPromptNode.props.selectionEnd) ??
                selectionStart + (selectedMarkdown?.length ?? 0)
            const listItemIndex = getNotebookNumberProp(currentPromptNode.props.listItemIndex)
            responseNodeIndex = nodes.findIndex((item) => item.id === targetNodeId)
            if (responseNodeIndex < 0) {
                console.error('Selection target node not found for AI submission')
                return false
            }
            nextDocument = currentDocument
            aiSelectionReviewRef.current = {
                promptNodeId: nodeId,
                targetNodeId,
                start: selectionStart,
                originalText: selectedMarkdown || '',
                pendingText: selectedMarkdown || '',
                listItemIndex,
            }
            commitDocument(nextDocument)
            clearInsertMenu()
            const markdownWithResponse = serializeMarkdownNotebook(nextDocument)
            const conversationId = createAIConversationId()
            const request: MarkdownNotebookAskAIRequest = {
                conversationId,
                instruction: query,
                query,
                source,
                apply: 'inline',
                responseNodeId: targetNodeId,
                responseNodeIndex,
                responseMarker: selectedMarkdown || '',
                markdown: markdownWithResponse,
                markdownWithResponse,
                selectedMarkdown,
                selectedRefId,
                selectionStart,
                selectionEnd,
                listItemIndex,
            }
            void Promise.resolve(onAskAI(request)).then((reply) => {
                if (typeof reply === 'string' && aiSelectionReviewRef.current?.promptNodeId === nodeId) {
                    aiSelectionReviewRef.current.pendingText = reply.trim()
                }
            })
            return true
        }

        const nodesWithResponse = nodes.map((currentNode, index): NotebookBlockNode => {
            if (currentNode.id !== nodeId || !isPromptComponentNode(currentNode)) {
                return currentNode
            }
            responseNodeIndex = index
            return {
                id: currentNode.id,
                type: 'paragraph',
                children: plainTextToInlineNodes(NOTEBOOK_AI_WRITING_PLACEHOLDER),
            }
        })
        if (responseNodeIndex === -1) {
            console.error('Prompt node not found for AI submission')
            return false
        }

        const conversationId = createAIConversationId()
        nextDocument = { ...currentDocument, nodes: nodesWithResponse }
        commitDocument(nextDocument)
        clearInsertMenu()
        const markdownWithResponse = serializeMarkdownNotebook(nextDocument)
        const responseMarker = NOTEBOOK_AI_WRITING_PLACEHOLDER
        onAskAI({
            conversationId,
            instruction: query,
            query,
            source,
            apply: 'block',
            responseNodeId: nodeId,
            responseNodeIndex,
            responseMarker,
            markdown: markdownWithResponse,
            markdownWithResponse,
            selectedMarkdown,
            selectedRefId,
        })
        return true
    }

    const submitActiveRootInsertMenu = (canvasElement: HTMLElement): boolean => {
        const inlineEditableElement = getInlineEditableElementForSelection(window.getSelection(), canvasElement)
        const nodeId = inlineEditableElement?.dataset.markdownNotebookNodeId
        if (!nodeId) {
            return false
        }

        const inputText = inlineEditableElement.textContent ?? ''
        if (inlineEditableElement.classList.contains('MarkdownNotebook__text-block--ai-prompt')) {
            return submitAIPromptForNode(nodeId, inputText)
        }

        if (insertMenu?.nodeId !== nodeId) {
            return false
        }

        if (insertMenu.mode === 'ai') {
            return submitAIPromptForNode(nodeId, inputText)
        }

        if (insertMenu.mode === undefined || insertMenu.mode === 'tools') {
            return submitInsertMenuSelectionForNode(nodeId, getInsertMenuFilterQuery(inputText))
        }

        return false
    }

    const moveActiveRootInsertMenuSelection = (
        canvasElement: HTMLElement,
        direction: InsertMenuSelectionDirection
    ): boolean => {
        const inlineEditableElement = getInlineEditableElementForSelection(window.getSelection(), canvasElement)
        const nodeId = inlineEditableElement?.dataset.markdownNotebookNodeId
        const isToolInsertMenuOpen =
            !!nodeId && insertMenu?.nodeId === nodeId && (insertMenu.mode === undefined || insertMenu.mode === 'tools')
        if (!isToolInsertMenuOpen) {
            return false
        }

        setInsertMenu((currentMenu) => {
            if (!currentMenu || currentMenu.nodeId !== nodeId) {
                return currentMenu
            }

            return {
                ...currentMenu,
                selectedIndex: getNextInsertMenuSelectedIndex(
                    currentMenu.selectedIndex,
                    getFilteredInsertCommands(insertCommands, currentMenu.query).length,
                    direction
                ),
            }
        })
        return true
    }

    const handleRootEditableKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        // Keyboard editing is dispatched from the root editing host based on the current selection: in real
        // browsers key events target the canvas (nested contenteditable blocks are not separate editing hosts).
        // Events from native editable elements (e.g. the AI prompt textarea) are excluded, because the DOM
        // selection can still point at a previously focused block.
        if (event.target instanceof HTMLElement && isNativeEditableElement(event.target)) {
            return
        }

        if (mode === 'edit' && event.key === 'Escape' && invitePicker) {
            event.preventDefault()
            event.stopPropagation()
            closeInvitePicker()
            return
        }

        if (mode === 'edit' && event.key === 'Escape' && insertMenu) {
            event.preventDefault()
            event.stopPropagation()
            dismissInsertMenu()
            return
        }

        if (
            mode === 'edit' &&
            event.key === 'F10' &&
            event.altKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            focusFormattingToolbar()
        ) {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (mode === 'edit' && event.key === 'Tab' && !event.altKey && !event.metaKey && !event.ctrlKey) {
            const inlineEditableElement = getInlineEditableElementForSelection(
                window.getSelection(),
                event.currentTarget
            )
            if (inlineEditableElement?.classList.contains('MarkdownNotebook__list-item-content')) {
                event.preventDefault()
                event.stopPropagation()
                shiftListItemDepthAtCurrentSelection(event.shiftKey ? 'out' : 'in')
                return
            }
            if (inlineEditableElement?.classList.contains('MarkdownNotebook__table-cell-content')) {
                event.preventDefault()
                event.stopPropagation()
                moveTableCellFocusAtCurrentSelection(event.shiftKey ? 'previous' : 'next')
                return
            }
            if (!event.shiftKey && inlineEditableElement?.classList.contains('MarkdownNotebook__code-block')) {
                event.preventDefault()
                event.stopPropagation()
                indentCodeBlockAtCurrentSelection()
                return
            }
        }

        if (
            mode === 'edit' &&
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            (splitListItemAtCurrentSelection() || insertTableRowAtCurrentSelection())
        ) {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (
            mode === 'edit' &&
            event.target === event.currentTarget &&
            (event.key === 'Backspace' || event.key === 'Delete') &&
            !event.shiftKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            deleteSelectedNotebookBlocks()
        ) {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (
            mode === 'edit' &&
            (event.key === 'Backspace' || event.key === 'Delete') &&
            !event.shiftKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            (deleteListItemRangeAtCurrentSelection() ||
                deleteListItemAtCurrentSelection(event.key === 'Backspace' ? 'backward' : 'forward') ||
                deleteEmptyCodeBlockAtCurrentSelection())
        ) {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (
            mode === 'edit' &&
            event.target === event.currentTarget &&
            (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
            !event.shiftKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            moveActiveRootInsertMenuSelection(event.currentTarget, event.key === 'ArrowDown' ? 'next' : 'previous')
        ) {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (
            mode === 'edit' &&
            event.key === 'ArrowDown' &&
            !event.shiftKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            insertParagraphBelowTrailingCodeBlockAtCurrentSelection()
        ) {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (
            mode !== 'edit' ||
            event.target !== event.currentTarget ||
            event.key !== 'Enter' ||
            event.shiftKey ||
            event.altKey ||
            event.metaKey ||
            event.ctrlKey
        ) {
            return
        }

        if (submitActiveRootInsertMenu(event.currentTarget)) {
            event.preventDefault()
            event.stopPropagation()
            return
        }

        if (splitTextBlockAtCurrentSelection()) {
            event.preventDefault()
            event.stopPropagation()
        }
    }

    const lockFloatingToolbarPosition = (): void => {
        if (!floatingToolbar) {
            return
        }

        floatingToolbarPositionLockRef.current = {
            placement: floatingToolbar.placement,
            top: floatingToolbar.top,
            left: floatingToolbar.left,
        }
    }

    // Alt+F10 moves keyboard focus into the floating toolbar (the standard editor-toolbar
    // shortcut); Escape in the toolbar hands focus back without collapsing the selection.
    const focusFormattingToolbar = (): boolean => {
        if (!floatingToolbar) {
            return false
        }

        lockFloatingToolbarPosition()
        const button = mainRef.current?.querySelector<HTMLButtonElement>(
            '.MarkdownNotebook__format-toolbar button:not([disabled])'
        )
        if (!button) {
            return false
        }

        button.focus()
        return true
    }

    const returnFocusFromFormattingToolbar = (): void => {
        canvasRef.current?.focus()
    }

    const allNodeGroups = getMarkdownNotebookVisualGroups(
        renderedNodes,
        insertMenu?.detached ? insertMenu.nodeId : undefined
    )
    const renderedNodeGroups = mode === 'edit' ? allNodeGroups : withoutLeadingEmptyTitleGroup(allNodeGroups)

    // The insert menu never takes focus (typing keeps filtering), so the canvas points at the
    // selected option via aria-activedescendant.
    const activeInsertMenuCommands =
        insertMenu && (insertMenu.mode ?? 'tools') === 'tools'
            ? getFilteredInsertCommands(insertCommands, insertMenu.query)
            : null
    const activeInsertMenuCommand =
        activeInsertMenuCommands?.[
            getClampedInsertMenuSelectedIndex(insertMenu?.selectedIndex ?? 0, activeInsertMenuCommands.length)
        ]
    const activeInsertMenuOptionDomId = activeInsertMenuCommand
        ? getInsertMenuOptionDomId(insertMenuDomId, activeInsertMenuCommand.key)
        : undefined

    const dropIndicatorTarget: { index: number; position: 'before' | 'after' } | null =
        (draggingNodeId !== null || isExternalDragOver) && dropBoundaryIndex !== null
            ? dropBoundaryIndex < renderedNodes.length
                ? { index: dropBoundaryIndex, position: 'before' }
                : renderedNodes.length
                  ? { index: renderedNodes.length - 1, position: 'after' }
                  : null
            : null

    const renderInsertBoundaryButton = (
        boundaryIndex: number,
        options: { isGapClickable?: boolean } = {}
    ): JSX.Element | null => {
        if (!showInsertBoundaries) {
            return null
        }

        return (
            <InsertBoundaryButton
                boundaryIndex={boundaryIndex}
                isAvailable={isInsertBoundaryAvailable(renderedNodes, boundaryIndex, insertMenu?.nodeId)}
                isVisible={isInsertBoundaryVisible(
                    renderedNodes,
                    boundaryIndex,
                    activeBoundaryIndex,
                    focusedRowIndex,
                    insertMenu?.nodeId
                )}
                isGapClickable={options.isGapClickable ?? true}
                focusPreviousNodeAtBoundaryEnd={focusPreviousNodeAtBoundaryEnd}
                openInsertMenuAtBoundary={openInsertMenuAtBoundary}
                setActiveBoundaryIndex={setActiveBoundaryIndex}
            />
        )
    }

    const renderPieceNoteStrip = (): JSX.Element | null => {
        const pieces = Object.values(document.annotations || {}).filter(
            (annotation) => annotation.scope === 'piece' && annotation.notes.length
        )
        if (!pieces.length) return null
        return (
            <div className="MarkdownNotebook__piece-notes" contentEditable={false}>
                {pieces.flatMap((annotation) =>
                    annotation.notes.map((note) => (
                        <button
                            key={`${annotation.id}:${note.by}`}
                            type="button"
                            className={clsx(
                                'MarkdownNotebook__piece-note',
                                annotation.resolved && 'MarkdownNotebook__piece-note--resolved'
                            )}
                            data-notebook-ref={annotation.id}
                            data-note-by={note.by}
                            data-note-name={note.name}
                            data-note-kind={note.kind || ''}
                            data-note-avatar={note.avatar || ''}
                            aria-label={note.name}
                        >
                            {note.avatar ? (
                                <img src={note.avatar} alt="" className="MarkdownNotebook__inline-note-face" />
                            ) : (
                                <span className="MarkdownNotebook__inline-note-fallback">
                                    {(note.name || note.by).charAt(0)}
                                </span>
                            )}
                        </button>
                    ))
                )}
            </div>
        )
    }

    const renderNotebookRow = (node: NotebookBlockNode, index: number): JSX.Element => {
        const isTitleRow = index === 0
        const isAIWritingNode = aiWritingNodeIndexSet.has(index)
        const nodeMode = isAIWritingNode ? 'view' : mode
        const isInsertMenuOpen = insertMenu?.nodeId === node.id
        const insertMenuMode = isInsertMenuOpen ? (insertMenu.mode ?? 'tools') : null
        const isToolInsertMenuOpen = isInsertMenuOpen && insertMenuMode === 'tools'
        const isAIPromptOpen = isPromptComponentNode(node)
        const componentDefinition =
            node.type === 'component' ? getMarkdownNotebookComponentDefinition(mergedRegistry, node.tagName) : undefined
        const componentPanelCacheEntry = node.type === 'component' ? componentPanelCache[node.id] : undefined
        // Only edit mode persists panel visibility to the document. Persisting encodes "open" as
        // the ABSENCE of hide* props, which a canvas fallback of filters-closed would immediately
        // override — opening filters would round-trip to closed. View-mode toggles stay local.
        const persistComponentPanelVisibility =
            mode === 'edit' && node.type === 'component'
                ? shouldPersistComponentPanelProps(node, componentDefinition)
                : false
        const fallbackComponentPanels =
            mode === 'view' && allowViewModeFilters
                ? CANVAS_COMPONENT_PANEL_VISIBILITY
                : DEFAULT_COMPONENT_PANEL_VISIBILITY
        const nodeComponentPanels =
            node.type === 'component'
                ? !persistComponentPanelVisibility && componentPanelCacheEntry?.current
                    ? componentPanelCacheEntry.current
                    : getComponentPanelVisibility(node, fallbackComponentPanels)
                : fallbackComponentPanels
        const shouldShowInlineInsertMenuButton =
            !isTitleRow && (isBlankInsertMenuButtonRow(node) || (isToolInsertMenuOpen && isTextBlockNode(node)))
        const hasInvalidInsertMenuQuery =
            isToolInsertMenuOpen &&
            insertMenu.query.length > 0 &&
            getFilteredInsertCommands(insertCommands, insertMenu.query).length === 0

        const isDraggableRow = mode === 'edit' && !isTitleRow && !isDiscussionCommentNode(node) && !isAIWritingNode
        const blockNotes =
            node.blockId && !isAIPromptOpen
                ? document.annotations?.[node.blockId]?.notes || []
                : []
        const canCommentOnBlock = mode === 'edit' && !isAIPromptOpen && !isAIWritingNode && !isDiscussionCommentNode(node)
        const canShowMoreMenu = canShowBlockMoreMenu({
            mode,
            isTitleRow,
            isAIPrompt: isAIPromptOpen,
            isAIWriting: isAIWritingNode,
            isDiscussionComment: isDiscussionCommentNode(node),
        })
        const blockMoreMenuItems = canShowMoreMenu
            ? buildBlockMoreMenuItems({ canInvite: true, canAskAI: Boolean(onAskAI) })
            : []
        const isBlockMenuOpen = blockMenuNodeId === node.id

        return (
            <div
                className={clsx(
                    'MarkdownNotebook__row',
                    isInsertMenuOpen && 'MarkdownNotebook__row--insert-menu-open',
                    isAIPromptOpen && 'MarkdownNotebook__row--ai-prompt',
                    isAIWritingNode && 'MarkdownNotebook__row--ai-writing',
                    aiTargetedNodeIds.has(node.id) && 'MarkdownNotebook__row--ai-targeted',
                    isDiscussionCommentNode(node) && 'MarkdownNotebook__row--margin-comment',
                    draggingNodeId === node.id && 'MarkdownNotebook__row--dragging',
                    inlineNotePopover?.nodeId === node.id && 'MarkdownNotebook__row--note-open',
                    isBlockMenuOpen && 'MarkdownNotebook__row--menu-open',
                    mobileActiveNodeId === node.id && 'MarkdownNotebook__row--mobile-active'
                )}
                onMouseEnter={(event) => updateActiveBoundaryFromRow(event, index)}
                onMouseMove={(event) => updateActiveBoundaryFromRow(event, index)}
                onFocusCapture={() => handleRowFocus(index)}
                onBlurCapture={(event) => handleRowBlur(event, index)}
                onTouchStart={(event) => handleRowTouchStart(node.id, isTitleRow, event)}
                onTouchMove={handleRowTouchMove}
                onTouchEnd={handleRowTouchEnd}
                onTouchCancel={handleRowTouchEnd}
                onContextMenu={(event) => {
                    if (mode !== 'edit' || isTitleRow) return
                    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
                        event.preventDefault()
                    }
                }}
            >
                {isDraggableRow ? (
                    <div
                        className="MarkdownNotebook__drag-handle"
                        contentEditable={false}
                        draggable
                        role="button"
                        aria-label="Drag to move block"
                        data-attr="markdown-notebook-drag-handle"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                        }}
                        onDragStart={(event) => handleBlockDragStart(event, node.id)}
                        onDragEnd={handleBlockDragEnd}
                    >
                        <IconDrag />
                    </div>
                ) : null}
                {canCommentOnBlock || canShowMoreMenu || blockNotes.length ? (
                    <div className="MarkdownNotebook__block-chrome" contentEditable={false}>
                        {blockNotes.length ? (
                            <div className="MarkdownNotebook__block-notes">
                                {blockNotes.map((note) => (
                                    <button
                                        key={`${node.blockId}:${note.by}`}
                                        type="button"
                                        className={clsx(
                                            'MarkdownNotebook__piece-note',
                                            document.annotations?.[node.blockId]?.resolved &&
                                                'MarkdownNotebook__piece-note--resolved'
                                        )}
                                        data-notebook-ref={node.blockId}
                                        data-note-by={note.by}
                                        data-note-name={note.name}
                                        data-note-kind={note.kind || ''}
                                        data-note-avatar={note.avatar || ''}
                                        aria-label={note.name}
                                        onClick={(event) => {
                                            event.preventDefault()
                                            event.stopPropagation()
                                            if (!node.blockId) return
                                            openBlockNotePopover(node.id, node.blockId, note, note.kind === 'human' && !note.text)
                                        }}
                                    >
                                        {note.avatar ? (
                                            <img src={note.avatar} alt="" className="MarkdownNotebook__inline-note-face" />
                                        ) : (
                                            <span className="MarkdownNotebook__inline-note-fallback">
                                                {(note.name || note.by).charAt(0)}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        {canCommentOnBlock ? (
                            <button
                                type="button"
                                className="MarkdownNotebook__block-comment-btn"
                                aria-label="Comment on this block"
                                title="Comment on this block"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    startBlockCommentForNode(node.id)
                                }}
                            >
                                <IconComment />
                            </button>
                        ) : null}
                        {canShowMoreMenu ? (
                            <LemonMenu
                                placement="bottom-end"
                                onVisibilityChange={(visible) =>
                                    setBlockMenuNodeId((current) => {
                                        if (visible) return node.id
                                        return current === node.id ? null : current
                                    })
                                }
                                items={blockMoreMenuItems.map((item) => ({
                                    label: item.label,
                                    status: item.status,
                                    icon:
                                        item.key === 'comment' ? (
                                            <IconComment className="size-4 opacity-50 group-hover/item:opacity-75" />
                                        ) : item.key === 'invite' ? (
                                            <IconPeople className="size-4 opacity-50 group-hover/item:opacity-75" />
                                        ) : item.key === 'wim-ai' ? (
                                            <IconSparkles className="size-4 text-blue-400 opacity-80 group-hover/item:opacity-100" />
                                        ) : item.key === 'delete' ? (
                                            <IconTrash className="size-4 text-red-400 opacity-70 group-hover/item:opacity-100" />
                                        ) : undefined,
                                    onClick: () => runBlockMoreMenuAction(node.id, item.key),
                                }))}
                            >
                                <button
                                    type="button"
                                    className="MarkdownNotebook__block-more-btn"
                                    aria-label="Block actions"
                                    title="Block actions"
                                    data-attr="markdown-notebook-block-menu"
                                    onMouseDown={(event) => event.preventDefault()}
                                >
                                    <IconEllipsis />
                                </button>
                            </LemonMenu>
                        ) : null}
                    </div>
                ) : null}
                {dropIndicatorTarget?.index === index ? (
                    <div
                        className={clsx(
                            'MarkdownNotebook__drop-indicator',
                            dropIndicatorTarget.position === 'after' && 'MarkdownNotebook__drop-indicator--after'
                        )}
                        contentEditable={false}
                    />
                ) : null}
                {renderNode({
                    node,
                    nodeIndex: index,
                    mode: nodeMode,
                    placeholder: isTitleRow
                        ? NOTEBOOK_TITLE_PLACEHOLDER
                        : isToolInsertMenuOpen
                          ? INSERT_MENU_PLACEHOLDER
                          : isAIPromptOpen
                            ? ''
                            : node.id === placeholderNodeId
                              ? placeholder
                              : undefined,
                    registry: mergedRegistry,
                    componentPanels: nodeComponentPanels,
                    rememberedComponentPanels: componentPanelCacheEntry?.remembered,
                    persistComponentPanelVisibility,
                    allowViewModeFilters,
                    isSelected: selectedComponentNodeIds.has(node.id),
                    toggleComponentPanel: (panel) => {
                        const nextPanels = {
                            ...nodeComponentPanels,
                            [panel]: !nodeComponentPanels[panel],
                        }

                        if (!persistComponentPanelVisibility) {
                            setLocalComponentPanels(node.id, nextPanels)
                            return
                        }

                        updateNode(node.id, (currentNode) => {
                            if (currentNode.type !== 'component') {
                                return currentNode
                            }

                            return withPersistedComponentPanelProps(currentNode, componentDefinition, nextPanels)
                        })
                    },
                    setLocalComponentPanels,
                    rememberComponentPanels,
                    setBlockRef: (element) => {
                        if (element) {
                            blockRefs.current[node.id] = element
                        } else if (!blockRefs.current[node.id]?.isConnected) {
                            delete blockRefs.current[node.id]
                        }
                    },
                    setListItemRef: (itemIndex, itemId, element) => {
                        listItemRefs.current[getListItemRefKey(node.id, itemIndex)] = element
                        if (itemId) {
                            listItemRefs.current[getListItemRefKey(node.id, itemId)] = element
                        }
                    },
                    setTableCellRef: (position, element) => {
                        tableCellRefs.current[getTableCellRefKey(node.id, position)] = element
                    },
                    updateNode,
                    replaceNodeWithNodes,
                    deleteNode: () => deleteNodeWithRefCleanup(node.id),
                    deleteNodeAndFocusAdjacent: () => {
                        requestFocusAfterRemovingNode(node.id)
                        deleteNodeWithRefCleanup(node.id)
                    },
                    acceptAISelection: () => {
                        aiSelectionReviewRef.current = null
                        requestFocusAfterRemovingNode(node.id)
                        deleteNodeWithRefCleanup(node.id)
                    },
                    rejectAISelection: () => {
                        const review = aiSelectionReviewRef.current
                        if (review && review.promptNodeId === node.id) {
                            replaceInlineRangeInNode(
                                review.targetNodeId,
                                review.start,
                                review.start + review.pendingText.length,
                                review.originalText,
                                review.listItemIndex
                            )
                        }
                        aiSelectionReviewRef.current = null
                        requestFocusAfterRemovingNode(node.id)
                        deleteNodeWithRefCleanup(node.id)
                    },
                    deleteNodeAndFocusPrevious,
                    deleteSelectedNotebookBlocks,
                    insertParagraphAfterNode: () => insertEmptyParagraphAfterNode(node.id),
                    deleteNodeBefore,
                    moveFocusToAdjacentNode,
                    openInsertMenu: (query = '') => openInsertMenu(node.id, query),
                    openSlashMenuAtToken: (token, children) => {
                        if (index === 0 || !isTextBlockNode(node)) {
                            return false
                        }
                        if (token.start === 0) {
                            const queryChildren = token.query ? [{ type: 'text' as const, text: token.query }] : []
                            const element = blockRefs.current[node.id]
                            const nextHtml = inlineNodesToHtml(queryChildren, documentRef.current.annotations)
                            rootEditableInputHtmlByNodeIdRef.current[node.id] = nextHtml
                            if (element && element.innerHTML !== nextHtml) {
                                element.innerHTML = nextHtml
                            }
                            updateNode(node.id, (currentNode) => {
                                if (!isTextBlockNode(currentNode)) {
                                    return currentNode
                                }
                                return { ...currentNode, children: queryChildren }
                            })
                            beginSlashInsertMenu(node.id, token.query)
                            return true
                        }
                        const parts = splitTextBlockAtSlashToken(node, children, token)
                        beginSlashInsertMenu(parts.command.id, token.query, { detached: true })
                        replaceNodeWithNodes(node.id, collectSlashSplitNodes(parts))
                        return true
                    },
                    openDetachedInsertMenu: () => openDetachedInsertMenuFromNode(node.id),
                    updateAIPromptQuery: (query) => updateAIPromptQuery(node.id, query),
                    closeInsertMenu: clearInsertMenu,
                    moveInsertMenuSelection: (direction) => {
                        setInsertMenu((currentMenu) => {
                            if (!currentMenu || currentMenu.nodeId !== node.id) {
                                return currentMenu
                            }

                            return {
                                ...currentMenu,
                                selectedIndex: getNextInsertMenuSelectedIndex(
                                    currentMenu.selectedIndex,
                                    getFilteredInsertCommands(insertCommands, currentMenu.query).length,
                                    direction
                                ),
                            }
                        })
                    },
                    toggleInsertMenu: () => {
                        if (isToolInsertMenuOpen || isAIPromptOpen) {
                            dismissInsertMenu()
                            return
                        }
                        openInsertMenu(node.id, getInlineInsertMenuQuery(node))
                    },
                    activateInlineInsertMenuButton: () => {
                        setActiveRowIndex(index)
                        setActiveBoundaryIndex(null)
                    },
                    showInlineInsertMenuButton: mode === 'edit' && !isAIWritingNode && shouldShowInlineInsertMenuButton,
                    isInlineInsertMenuButtonVisible: activeRowIndex === index || isToolInsertMenuOpen || isAIPromptOpen,
                    isInsertMenuOpen,
                    insertMenuMode,
                    hasInvalidInsertMenuQuery,
                    isAIWriting: isAIWritingNode,
                    isAIWritingPlaceholder: aiWritingPlaceholderNodeIds.has(node.id),
                    isAIShimmering:
                        isAIWritingNode || (isAIPromptSubmitDisabled && aiSelectionReviewRef.current?.targetNodeId === node.id),
                    aiPromptFocusRequest:
                        focusAIPromptNodeId === node.id && focusAIPromptRequest !== undefined
                            ? focusAIPromptRequest
                            : undefined,
                    isAIPromptSubmitDisabled,
                    submitInsertMenuSelection: (queryOverride) =>
                        submitInsertMenuSelectionForNode(node.id, queryOverride),
                    submitAIPrompt: (queryOverride) => submitAIPromptForNode(node.id, queryOverride),
                    handleSelectionChange,
                    startTextSelectionPointer,
                    restoreSelectionRef,
                    rootEditableInputHtmlByNodeIdRef,
                })}
                {isToolInsertMenuOpen ? (
                    <InsertMenu
                        id={insertMenuDomId}
                        query={insertMenu.query}
                        commands={insertCommands}
                        targetNodeId={node.id}
                        position={insertMenuPosition}
                        selectedIndex={insertMenu.selectedIndex}
                        onClose={clearInsertMenu}
                    />
                ) : null}
            </div>
        )
    }

    const firstTextGroupKey = renderedNodeGroups.find((group) => group.type === 'text')?.key
    const mobileBarIndex = mobileActiveNodeId
        ? renderedNodes.findIndex((node) => node.id === mobileActiveNodeId)
        : -1
    const mobileBarNode = mobileBarIndex > 0 ? renderedNodes[mobileBarIndex] : null
    const showMobileBlockBar = mode === 'edit' && Boolean(mobileBarNode && mobileBarAnchor)
    const mobileBarIsAIWriting = mobileBarIndex >= 0 && aiWritingNodeIndexSet.has(mobileBarIndex)
    const mobileBarIsPrompt = Boolean(mobileBarNode && isPromptComponentNode(mobileBarNode))

    return (
        <NotebookAnnotationsContext.Provider value={document.annotations || EMPTY_ANNOTATIONS}>
        <div
            className={clsx(
                'MarkdownNotebook',
                mode === 'edit' && 'MarkdownNotebook--edit',
                hasDiscussionComments && 'MarkdownNotebook--comments-inline',
                className
            )}
            data-attr={dataAttr}
            ref={notebookRef}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handleNotebookPaste}
            onKeyDownCapture={handleNotebookKeyDown}
        >
            <div className="MarkdownNotebook__debug-layout">
                <div className="MarkdownNotebook__main" ref={mainRef} onMouseDown={handleMainMouseDown} onClick={handleMainClick}>
                    {document.errors.length ? (
                        <div className="MarkdownNotebook__parse-errors">
                            {document.errors.map((error) => (
                                <div key={`${error.line}:${error.message}`}>{error.message}</div>
                            ))}
                        </div>
                    ) : null}
                    <div
                        className="MarkdownNotebook__canvas"
                        ref={canvasRef}
                        data-writing-dock
                        contentEditable={mode === 'edit'}
                        suppressContentEditableWarning
                        data-markdown-notebook-editor
                        role={mode === 'edit' ? 'textbox' : undefined}
                        aria-multiline={mode === 'edit' ? true : undefined}
                        aria-label={mode === 'edit' ? 'Notebook editor' : undefined}
                        aria-controls={activeInsertMenuOptionDomId ? insertMenuDomId : undefined}
                        aria-expanded={activeInsertMenuOptionDomId ? true : undefined}
                        aria-activedescendant={activeInsertMenuOptionDomId}
                        onInput={handleRootEditableInput}
                        onKeyDown={handleRootEditableKeyDown}
                        onMouseLeave={handleCanvasMouseLeave}
                        onClick={handleCanvasClick}
                        onDragStartCapture={() => {
                            canvasDragOriginRef.current = true
                        }}
                        onDragEndCapture={() => {
                            canvasDragOriginRef.current = false
                        }}
                        onDragOver={handleCanvasDragOver}
                        onDrop={handleCanvasDrop}
                        onDragLeave={handleCanvasDragLeave}
                    >
                        {renderInsertBoundaryButton(0)}
                        {renderedNodeGroups.map((group) => {
                            if (group.type === 'text') {
                                const lastItem = group.items[group.items.length - 1]
                                const chunks: { surface: MarkdownNotebookTextSurface; items: typeof group.items }[] = []
                                for (const item of group.items) {
                                    const lastChunk = chunks[chunks.length - 1]
                                    // Code blocks never merge: each one is its own surface with its own line
                                    // numbers and copy button.
                                    if (lastChunk && lastChunk.surface === item.surface && item.surface !== 'code') {
                                        lastChunk.items.push(item)
                                    } else {
                                        chunks.push({ surface: item.surface, items: [item] })
                                    }
                                }

                                return (
                                    <Fragment key={group.key}>
                                        <div className="MarkdownNotebook__text-group">
                                            {group.key === firstTextGroupKey ? renderPieceNoteStrip() : null}
                                            {chunks.map((chunk) => {
                                                const chunkLastIndex = chunk.items[chunk.items.length - 1].index
                                                const rows = chunk.items.map(({ node, index }) => (
                                                    <Fragment key={node.id}>
                                                        {renderNotebookRow(node, index)}
                                                        {chunk.surface === 'text' && index < chunkLastIndex
                                                            ? renderInsertBoundaryButton(index + 1, {
                                                                  isGapClickable: false,
                                                              })
                                                            : null}
                                                    </Fragment>
                                                ))

                                                return (
                                                    <Fragment key={chunk.items[0].node.id}>
                                                        {chunk.surface === 'quote' ? (
                                                            <div className="MarkdownNotebook__blockquote-group">
                                                                {rows}
                                                            </div>
                                                        ) : chunk.surface === 'code' ? (
                                                            <div className="MarkdownNotebook__code-group">{rows}</div>
                                                        ) : (
                                                            rows
                                                        )}
                                                        {chunkLastIndex < lastItem.index
                                                            ? renderInsertBoundaryButton(chunkLastIndex + 1, {
                                                                  isGapClickable: false,
                                                              })
                                                            : null}
                                                    </Fragment>
                                                )
                                            })}
                                        </div>
                                        {renderInsertBoundaryButton(lastItem.index + 1)}
                                    </Fragment>
                                )
                            }

                            return (
                                <Fragment key={group.key}>
                                    {renderNotebookRow(group.node, group.index)}
                                    {renderInsertBoundaryButton(group.index + 1)}
                                </Fragment>
                            )
                        })}
                    </div>
                    {adjustedRemoteCarets?.length ? (
                        <RemoteCaretOverlay
                            carets={adjustedRemoteCarets}
                            nodes={document.nodes}
                            blockRefs={blockRefs}
                            listItemRefs={listItemRefs}
                            containerRef={mainRef}
                        />
                    ) : null}
                    {showMobileBlockBar && mobileBarNode && mobileBarAnchor ? (
                        <div
                            className={clsx(
                                'MarkdownNotebook__mobile-block-bar',
                                `MarkdownNotebook__mobile-block-bar--${mobileBarAnchor.placement}`
                            )}
                            contentEditable={false}
                            role="toolbar"
                            aria-label="Block actions"
                            data-scheme="primary"
                            style={{
                                top: mobileBarAnchor.top,
                                left: mobileBarAnchor.left,
                            }}
                        >
                            {!mobileBarIsPrompt && !mobileBarIsAIWriting && !isDiscussionCommentNode(mobileBarNode) ? (
                                <button
                                    type="button"
                                    className="MarkdownNotebook__mobile-block-bar-btn"
                                    onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        clearMobileBlockBar()
                                        startBlockCommentForNode(mobileBarNode.id)
                                    }}
                                    title="Comment"
                                    aria-label="Comment"
                                >
                                    <IconComment className="size-4" />
                                </button>
                            ) : null}
                            {onAskAI && !mobileBarIsPrompt ? (
                                <button
                                    type="button"
                                    className="MarkdownNotebook__mobile-block-bar-btn"
                                    onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        clearMobileBlockBar()
                                        runBlockMoreMenuAction(mobileBarNode.id, 'wim-ai')
                                    }}
                                    title="Ask AI"
                                    aria-label="Ask AI"
                                >
                                    <IconSparkles className="size-4 text-blue-400" />
                                </button>
                            ) : null}
                            {mobileBarIndex > 1 ? (
                                <button
                                    type="button"
                                    className="MarkdownNotebook__mobile-block-bar-btn"
                                    onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        moveBlockUp(mobileBarNode.id)
                                    }}
                                    title="Move up"
                                    aria-label="Move up"
                                >
                                    <ArrowUp className="size-4" />
                                </button>
                            ) : null}
                            {mobileBarIndex < renderedNodes.length - 1 ? (
                                <button
                                    type="button"
                                    className="MarkdownNotebook__mobile-block-bar-btn"
                                    onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        moveBlockDown(mobileBarNode.id)
                                    }}
                                    title="Move down"
                                    aria-label="Move down"
                                >
                                    <ArrowDown className="size-4" />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="MarkdownNotebook__mobile-block-bar-btn"
                                onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    duplicateBlock(mobileBarNode.id)
                                    clearMobileBlockBar()
                                }}
                                title="Duplicate"
                                aria-label="Duplicate"
                            >
                                <IconCopy className="size-4" />
                            </button>
                            <button
                                type="button"
                                className="MarkdownNotebook__mobile-block-bar-btn MarkdownNotebook__mobile-block-bar-btn--danger"
                                onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    clearMobileBlockBar()
                                    runBlockMoreMenuAction(mobileBarNode.id, 'delete')
                                }}
                                title="Delete"
                                aria-label="Delete"
                            >
                                <IconTrash className="size-4" />
                            </button>
                            <button
                                type="button"
                                className="MarkdownNotebook__mobile-block-bar-btn"
                                onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    clearMobileBlockBar()
                                }}
                                title="Close"
                                aria-label="Close"
                            >
                                <IconX className="size-4" />
                            </button>
                        </div>
                    ) : null}
                    {floatingToolbar && mode === 'edit' ? (
                        <FormattingToolbar
                            selectedBlockStyle={getSelectedBlockStyle(
                                floatingToolbar.textRanges,
                                floatingToolbar.codeRanges,
                                floatingToolbar.listItemRanges
                            )}
                            selectedBlockQuoted={getSelectedBlocksQuoted(
                                floatingToolbar.textRanges,
                                floatingToolbar.codeRanges,
                                floatingToolbar.listItemRanges
                            )}
                            placement={floatingToolbar.placement}
                            top={floatingToolbar.top}
                            left={floatingToolbar.left}
                            showInlineActions={
                                (floatingToolbar.textRanges.length > 0 || floatingToolbar.listItemRanges.length > 0) &&
                                floatingToolbar.codeRanges.length === 0
                            }
                            applyInlineMark={applyInlineMark}
                            applyInlineLink={applyInlineLink}
                            currentLinkHref={getFloatingToolbarLinkHref(floatingToolbar)}
                            initialLinkEditorOpen={floatingToolbar.isLinkEditorOpen ?? false}
                            setBlockStyle={setSelectedBlockStyle}
                            copySelection={copyFloatingToolbarSelection}
                            askAIAboutSelection={onAskAI ? askAIAboutSelection : undefined}
                            selectionAIActions={onAskAI ? selectionAIActions : undefined}
                            isAskAIDisabled={isAIPromptSubmitDisabled}
                            startInlineCommentAtSelection={
                                canStartInlineCommentAtSelection() ? () => startInlineCommentAtSelection() : undefined
                            }
                            lockPosition={lockFloatingToolbarPosition}
                            returnFocusToEditor={returnFocusFromFormattingToolbar}
                        />
                    ) : null}
                    {invitePicker ? (
                        <InvitePhilosopherPicker
                            position={invitePickerPosition}
                            onClose={closeInvitePicker}
                            onConfirm={(botIds) => invitePhilosophersToNode(invitePicker.nodeId, botIds)}
                        />
                    ) : null}
                    {mentionPicker ? (
                        <MentionPicker
                            people={filterMentionPeople(listMentionPeople(), mentionPicker.query)}
                            query={mentionPicker.query}
                            position={
                                blockRefs.current[mentionPicker.nodeId]
                                    ? getInsertMenuPosition(blockRefs.current[mentionPicker.nodeId]!, {
                                          width: INVITE_PICKER_WIDTH,
                                          maxHeight: INVITE_PICKER_MAX_HEIGHT,
                                          minHeight: INVITE_PICKER_MIN_HEIGHT,
                                      })
                                    : null
                            }
                            onClose={closeMentionPicker}
                            onPick={insertMentionPerson}
                        />
                    ) : null}
                    {inviteStatus ? (
                        <div
                            className={clsx(
                                'MarkdownNotebook__invite-status',
                                inviteStatus.error && 'MarkdownNotebook__invite-status--error',
                                invitePickerPosition && 'MarkdownNotebook__invite-status--positioned',
                                invitePickerPosition && `MarkdownNotebook__invite-status--${invitePickerPosition.placement}`
                            )}
                            style={
                                invitePickerPosition
                                    ? ({
                                          '--markdown-notebook-invite-picker-left': `${invitePickerPosition.left}px`,
                                          '--markdown-notebook-invite-picker-top': `${invitePickerPosition.top}px`,
                                          '--markdown-notebook-invite-picker-width': `${invitePickerPosition.width}px`,
                                          '--markdown-notebook-invite-picker-max-height': `${invitePickerPosition.maxHeight}px`,
                                      } as CSSProperties)
                                    : undefined
                            }
                            contentEditable={false}
                        >
                            {inviteStatus.error ||
                                `${inviteStatus.names.join(' and ')} ${
                                    inviteStatus.names.length === 1 ? 'is' : 'are'
                                } reading the page…`}
                        </div>
                    ) : null}
                    {inlineNotePopover ? (
                        <InlineNotePopover
                            name={inlineNotePopover.name}
                            avatar={inlineNotePopover.avatar}
                            text={inlineNotePopover.text}
                            createdAt={inlineNotePopover.createdAt}
                            kind={inlineNotePopover.kind}
                            intent={inlineNotePopover.intent}
                            suggestion={inlineNotePopover.suggestion}
                            scope={inlineNotePopover.scope}
                            pending={inlineNotePopover.pending}
                            draft={inlineNotePopover.draft}
                            resolved={inlineNotePopover.resolved}
                            top={inlineNotePopover.top}
                            left={inlineNotePopover.left}
                            onChangeDraft={(value) =>
                                setInlineNotePopover((current) => (current ? { ...current, text: value } : current))
                            }
                            onSave={() => {
                                const next = inlineNotePopover
                                updateAnnotations((current) =>
                                    updateNoteInAnnotations(current, next.refId, next.by, {
                                        text: next.text.trim(),
                                        pending: false,
                                        createdAt: next.createdAt || new Date().toISOString(),
                                    })
                                )
                                setInlineNotePopover(null)
                                returnFocusToEditor(next.nodeId)
                            }}
                            onClose={() => {
                                if (inlineNotePopover.draft && !inlineNotePopover.text.trim()) {
                                    removeInlineNote(inlineNotePopover.refId)
                                    return
                                }
                                const nodeId = inlineNotePopover.nodeId
                                setInlineNotePopover(null)
                                returnFocusToEditor(nodeId)
                            }}
                            onDelete={() => removeInlineNote(inlineNotePopover.refId, inlineNotePopover.by)}
                            onToggleResolved={
                                inlineNotePopover.draft
                                    ? undefined
                                    : () => {
                                          const next = inlineNotePopover
                                          const resolved = !next.resolved
                                          updateAnnotations((current) =>
                                              setAnnotationResolved(current, next.refId, resolved)
                                          )
                                          setInlineNotePopover((current) =>
                                              current ? { ...current, resolved } : current
                                          )
                                      }
                            }
                            onApply={
                                inlineNotePopover.intent === 'edit' && inlineNotePopover.suggestion
                                    ? () => {
                                          const next = inlineNotePopover
                                          commitDocument({
                                              ...documentRef.current,
                                              nodes: replaceRefQuotedText(
                                                  documentRef.current.nodes,
                                                  next.refId,
                                                  next.suggestion || ''
                                              ),
                                          })
                                          setInlineNotePopover((current) =>
                                              current
                                                  ? { ...current, suggestion: undefined }
                                                  : current
                                          )
                                      }
                                    : undefined
                            }
                        />
                    ) : null}
                </div>
            </div>
        </div>
        </NotebookAnnotationsContext.Provider>
    )
}
