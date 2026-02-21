import * as React from 'react'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import KeyboardShortcut from "components/KeyboardShortcut"

export interface ContextMenuItemProps {
    type: 'item' | 'separator'
    label?: string
    onClick?: () => void
    disabled?: boolean
    children?: React.ReactNode
    shortcut?: string[]
}

export interface ContextMenuProps {
    children: React.ReactNode
    menuItems: ContextMenuItemProps[]
    className?: string
}

const ContextMenu = ({ children, menuItems, className }: ContextMenuProps) => {
    // Style classes matching MenuBar patterns
    const TriggerClasses = className || ''
    const ContentClasses =
        'bg-primary min-w-[220px] rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[transform,opacity]'
    const ItemClasses =
        'group relative flex h-[25px] select-none items-center rounded-[3px] px-2.5 text-[13px] leading-none text-primary outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-input-bg data-[disabled]:text-muted data-[highlighted]:text-primary data-[highlighted]:bg-accent'
    const SeparatorClasses = 'm-[5px] h-px bg-border'

    return (
        <ContextMenuPrimitive.Root>
            <ContextMenuPrimitive.Trigger className={TriggerClasses}>{children}</ContextMenuPrimitive.Trigger>
            <ContextMenuPrimitive.Portal>
                <ContextMenuPrimitive.Content className={ContentClasses} data-scheme="primary">
                    {menuItems.map((item, index) => {
                        if (item.type === 'separator') {
                            return <ContextMenuPrimitive.Separator key={index} className={SeparatorClasses} />
                        }

                        return (
                            <ContextMenuPrimitive.Item
                                key={index}
                                className={ItemClasses}
                                disabled={item.disabled}
                                onSelect={() => {
                                    // Execute any onClick handlers
                                    item.onClick?.()
                                }}
                            >
                                <div
                                    onClick={() => {
                                        // Force close the context menu by dispatching Escape key
                                        setTimeout(() => {
                                            const escapeEvent = new KeyboardEvent('keydown', {
                                                key: 'Escape',
                                                bubbles: true,
                                            })
                                            document.dispatchEvent(escapeEvent)
                                        }, 0)
                                    }}
                                    className="w-full flex justify-between items-center gap-1"
                                >
                                    <span>
                                        {item.children || item.label}
                                    </span>
                                    <span>
                                        {item.shortcut && <KeyboardShortcut text={item.shortcut.join(' ')} size="sm" />}
                                    </span>
                                </div>
                            </ContextMenuPrimitive.Item>
                        )
                    })}
                </ContextMenuPrimitive.Content>
            </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Root>
    )
}

export default ContextMenu
