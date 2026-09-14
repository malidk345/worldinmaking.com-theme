export interface OSActionCard {
    type:
        | 'create_notebook'
        | 'create_forum_topic'
        | 'open_window'
        | 'insert_notebook_block'
        | 'rewrite_notebook_document'
        | 'replace_notebook_selection'
        | 'update_notebook_title'
        | 'manage_windows'
        | 'set_system_appearance'
        | 'annotate_notebook'
        | 'publish_to_forum'
        | 'add_notebook_footnote'
        | string
    title: string
    description: string
    payload: {
        title?: string
        content?: string
        path?: string
        notebookId?: string
        action?: string
        target?: string
        left_path?: string
        right_path?: string
    }
    executed?: boolean
}
