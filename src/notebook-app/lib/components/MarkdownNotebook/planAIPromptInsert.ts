import { getSlashTokenAt, isTextBlockNode } from './documentModel'
import { splitInlineNodesAt } from './inlineContent'
import { makeEmptyParagraph } from './markdown'
import { makePromptComponentNode } from './notebookEditorModel'
import { NotebookBlockNode, NotebookComponentProps } from './types'
import { getInlineText } from './utils'

export type OpenAIPromptInsertOptions = {
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

export function buildAIPromptProps(nodeId: string, options?: OpenAIPromptInsertOptions): NotebookComponentProps {
    const promptProps: NotebookComponentProps = {
        question: options?.question ?? '',
    }
    if (options?.source === 'selection') {
        promptProps.source = 'selection'
        promptProps.selectedMarkdown = options.selectedMarkdown ?? ''
        promptProps.targetNodeId = options.targetNodeId ?? nodeId
        if (options.selectionStart != null) promptProps.selectionStart = options.selectionStart
        if (options.selectionEnd != null) promptProps.selectionEnd = options.selectionEnd
        if (options.listItemIndex != null) promptProps.listItemIndex = options.listItemIndex
        if (options.selectedRefId) promptProps.ref = options.selectedRefId
    }
    if (options?.autoRun) promptProps.autoRun = true
    return promptProps
}

export function planOpenAIPromptInsert(
    nodes: NotebookBlockNode[],
    nodeId: string,
    options?: OpenAIPromptInsertOptions
): { nodes: NotebookBlockNode[]; promptId: string } {
    const promptProps = buildAIPromptProps(nodeId, options)
    let didUpdate = false
    let promptId = nodeId
    const nextNodes: NotebookBlockNode[] = nodes.flatMap((currentNode): NotebookBlockNode[] => {
        if (didUpdate || currentNode.id !== nodeId) {
            return [currentNode]
        }
        didUpdate = true
        if (options?.source === 'selection') {
            promptId = makeEmptyParagraph(`wimai-${nodeId}`).id
            return [makePromptComponentNode(promptId, promptProps), currentNode]
        }
        if (isTextBlockNode(currentNode)) {
            const rawText = getInlineText(currentNode.children)
            const slash =
                getSlashTokenAt(rawText, rawText.length) ||
                getSlashTokenAt(rawText, Math.max(0, rawText.length - 1))
            const remainder = slash ? splitInlineNodesAt(currentNode.children, slash.start)[0] : currentNode.children
            if (getInlineText(remainder).trim()) {
                promptId = makeEmptyParagraph(`wimai-${nodeId}`).id
                return [{ ...currentNode, children: remainder }, makePromptComponentNode(promptId, promptProps)]
            }
        }
        if (!isTextBlockNode(currentNode) && currentNode.type !== 'component') {
            return [currentNode]
        }
        return [makePromptComponentNode(promptId, promptProps)]
    })
    if (!didUpdate) {
        promptId = makeEmptyParagraph(`wimai-${nodeId}`).id
        nextNodes.push(makePromptComponentNode(promptId, promptProps))
    }
    return { nodes: nextNodes, promptId }
}
