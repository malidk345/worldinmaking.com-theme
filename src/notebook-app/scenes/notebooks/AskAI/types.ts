export interface OSActionCard {
    type: 'create_notebook' | 'create_forum_topic' | 'open_window' | 'insert_notebook_block'
    title: string
    description: string
    payload: {
        title?: string
        content?: string
        path?: string
        notebookId?: string
    }
    executed?: boolean
}
