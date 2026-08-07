export type BlockType =
    | 'paragraph'
    | 'heading_1' | 'heading_2' | 'heading_3'
    | 'bulleted_list' | 'numbered_list' | 'toggle_list'
    | 'subpage_card'
    | 'callout'
    | 'code_block'
    | 'table'
    | 'image' | 'file' | 'video'
    | 'divider'
    | 'quote'
    | 'embed';

export interface NotebookBlock {
    id: string; // UUID v4
    parentId: string | null; // Null for root level blocks
    type: BlockType;
    content: Record<string, unknown>; // Rich text delta / attributes
    children: string[]; // Child block IDs (nested structures)
    metadata: {
        createdAt: number;
        updatedAt: number;
        createdBy: string;
        color?: string;
        backgroundColor?: string;
    };
}
