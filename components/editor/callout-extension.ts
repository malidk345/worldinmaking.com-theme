import { Node, mergeAttributes, CommandProps } from '@tiptap/core'

export type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'tip'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type: CalloutType }) => ReturnType
      toggleCallout: (attrs?: { type: CalloutType }) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

export const CalloutExtension = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: el => (el.getAttribute('data-callout-type') as CalloutType) || 'info',
        renderHTML: attrs => ({ 'data-callout-type': attrs.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-block="callout"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block': 'callout',
        class: `callout-block callout-${HTMLAttributes['data-callout-type'] || 'info'}`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.toggleWrap(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }: CommandProps) =>
          commands.lift(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      // Exit callout on Enter at end of empty paragraph
      Enter: ({ editor }) => {
        const { state } = editor
        const { selection, doc } = state
        const { $anchor, empty } = selection
        if (!empty) return false
        const isCallout = $anchor.node(-1)?.type.name === 'callout'
        if (!isCallout) return false
        const isAtEnd = $anchor.parentOffset === $anchor.parent.content.size
        const isEmpty = $anchor.parent.content.size === 0
        if (isAtEnd && isEmpty) {
          return editor.chain().liftListItem(this.name).run()
        }
        return false
      },
    }
  },
})
