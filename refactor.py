import re

with open('src/components/AppWindow/index.tsx', 'r') as f:
    content = f.read()

# Add imports
imports_to_add = """import { useWindowVisibility } from 'hooks/useWindowVisibility'
import { useWindowSwitcher } from 'hooks/useWindowSwitcher'
import { useWindowActions } from 'hooks/useWindowActions'
import { useWindowStyles } from 'hooks/useWindowStyles'
import { useWindowMenu } from 'hooks/useWindowMenu'
import WindowResizeHandles from './WindowResizeHandles'"""

content = re.sub(
    r"import \{ useWindowVisibility \} from 'hooks/useWindowVisibility'\nimport \{ useWindowSwitcher \} from 'hooks/useWindowSwitcher'\nimport \{ useWindowActions \} from 'hooks/useWindowActions'\nimport WindowResizeHandles from './WindowResizeHandles'",
    imports_to_add,
    content
)

# Remove recursiveSearch
content = re.sub(
    r"const recursiveSearch = \(array: MenuItem\[\] \| undefined, value: string\): boolean => \{.*?\n\}\n\nconst WindowContainer",
    "const WindowContainer",
    content,
    flags=re.DOTALL
)

# Replace menu logic
menu_logic = """    const safeAppMenu = Array.isArray(appMenu) ? appMenu : []
    const parent =
        safeAppMenu.find(({ children, url }: any) => {
            const currentURL = item?.path
            return currentURL === url?.split('?')[0] || recursiveSearch(children, currentURL)
        }) ||
        safeAppMenu.find(({ url }: any) => url === `/${item?.path?.split('/')[1]}`) ||
        safeAppMenu.find(({ name }: any) => name === 'Docs')

    const internalMenu = parent?.children || []

    const getActiveInternalMenu = useCallback(() => {
        return internalMenu?.find((menuItem: MenuItem) => {
            const currentURL = item?.path
            return currentURL === menuItem.url?.split('?')[0] || recursiveSearch(menuItem.children, currentURL)
        })
    }, [internalMenu, item])

    const [activeInternalMenu, setActiveInternalMenu] = useState<MenuItem | undefined>(getActiveInternalMenu())

    useEffect(() => {
        setMenu?.(internalMenu)
    }, [activeInternalMenu])"""

replacement_menu_logic = "    const { activeInternalMenu } = useWindowMenu(item, appMenu, setMenu)\n    const { className } = useWindowStyles({ item, focusedWindow, isCompositorActive })"

content = content.replace(menu_logic, replacement_menu_logic)

# Replace setActiveInternalMenu effect (which isn't needed anymore as it's in the hook)
effect_to_remove = """    useEffect(() => {
        setActiveInternalMenu(getActiveInternalMenu())
    }, [item?.path, getActiveInternalMenu])"""

content = content.replace(effect_to_remove, "")

# Replace className block
class_name_block = """                    tabIndex={-1}
                    data-scheme={isScratchpadWindowPath(item.path) || isTrashWindowPath(item.path) ? 'primary' : 'tertiary'}
                    className={`group @container absolute overflow-hidden pointer-events-auto !select-auto flex flex-col border transition-shadow duration-200 ${
                        focusedWindow?.key === item.key
                            ? 'border-primary/90 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)]'
                            : `border-primary/40 shadow-sm${
                                  isScratchpadWindowPath(item.path) || isTrashWindowPath(item.path) ? '' : ' opacity-[0.985]'
                              }`
                    } ${isScratchpadWindowPath(item.path) || isTrashWindowPath(item.path) ? 'bg-primary' : WINDOW_BG} ${
                        isCompositorActive ? MOTION_LAYER : ''
                    } ${
                        item.expanded
                            ? 'border-t-0 rounded-t-none rounded-b-lg !shadow-none'
                            : item.snapped
                            ? `border-t-0 !shadow-none ${
                                  item.snapped === 'left'
                                      ? 'rounded-tl-none rounded-tr-none rounded-br-none rounded-bl-lg'
                                      : 'rounded-tl-none rounded-tr-none rounded-bl-none rounded-br-lg'
                              }`
                            : 'rounded-lg'
                    }`}
                    style={{"""

replacement_class_name = """                    tabIndex={-1}
                    data-scheme={isScratchpadWindowPath(item.path) || isTrashWindowPath(item.path) ? 'primary' : 'tertiary'}
                    className={className}
                    style={{"""

content = content.replace(class_name_block, replacement_class_name)

# Replace transition block
transition_block = """                    exit={{
                        scale: 0.95,
                        opacity: 0,
                        transition: {
                            duration: compact ? 0.05 : 0.12,
                            ease: [0.32, 0, 0.67, 0],
                        },
                    }}
                    transition={
                        compact || siteSettings?.performanceBoost || dragging
                            ? { duration: 0 }
                            : {
                                  scale: { type: 'spring', stiffness: 440, damping: 25, mass: 0.6 },
                                  left: { type: 'spring', stiffness: 380, damping: 27, mass: 0.75 },
                                  top: { type: 'spring', stiffness: 380, damping: 27, mass: 0.75 },
                                  width: { type: 'spring', stiffness: 360, damping: 28, mass: 0.8 },
                                  height: { type: 'spring', stiffness: 360, damping: 28, mass: 0.8 },
                                  opacity: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
                                  default: { type: 'spring', stiffness: 380, damping: 26 },
                              }
                    }
                    drag={inSwitcher ? false : !item.fixedSize}"""

replacement_transition = """                    exit={{
                        scale: 0.96, // iOS 26 compression logic
                        opacity: 0,
                        transition: {
                            duration: compact ? 0.05 : 0.25,
                            ease: [0.25, 1, 0.5, 1], // iOS 26 custom transition curve
                        },
                    }}
                    transition={
                        compact || siteSettings?.performanceBoost || dragging
                            ? { duration: 0 }
                            : {
                                  // iOS 26 kinetic spring and fluid transitions
                                  scale: { type: 'spring', stiffness: 500, damping: 30, mass: 0.5 },
                                  left: { type: 'spring', stiffness: 420, damping: 35, mass: 0.8 },
                                  top: { type: 'spring', stiffness: 420, damping: 35, mass: 0.8 },
                                  width: { type: 'spring', stiffness: 400, damping: 32, mass: 0.8 },
                                  height: { type: 'spring', stiffness: 400, damping: 32, mass: 0.8 },
                                  opacity: { duration: 0.2, ease: [0.25, 1, 0.5, 1] },
                                  default: { type: 'spring', stiffness: 420, damping: 35 },
                              }
                    }
                    drag={inSwitcher ? false : !item.fixedSize}"""

content = content.replace(transition_block, replacement_transition)

with open('src/components/AppWindow/index.tsx', 'w') as f:
    f.write(content)
