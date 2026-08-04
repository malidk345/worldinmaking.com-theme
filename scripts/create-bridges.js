const fs = require('fs')
const path = require('path')

const libBase = path.resolve(__dirname, '../src/lib')
const nbBase  = path.resolve(__dirname, '../src/notebook-app/lib')

// All lib/* paths that need bridges or shims
const paths = [
    'components/ScrollableShadows/ScrollableShadows',
    'components/Cards/TextCard/TextCard',
    'components/DateFilter/types',
    'components/EmojiPicker/EmojiPickerPopover',
    'components/HelpMenu/incidentStatus',
    'components/HelpMenu/incidentStatusLogic',
    'components/KeyboardShortcut/KeyboardShortcut',
    'components/PayGateMini/PayGateButton',
    'components/Resizer/Resizer',
    'components/Resizer/resizerLogic',
    'components/RichContentEditor',
    'components/RichContentEditor/CommandEnterExtension',
    'components/RichContentEditor/EmojiSuggestionExtension',
    'components/RichContentEditor/MentionsExtension',
    'components/RichContentEditor/RichContentNodeMention',
    'components/RichContentEditor/types',
    'components/RichContentEditor/utils',
    'components/Superpowers/superpowersLogic',
    'components/TaxonomicFilter/types',
    'components/TZLabel',
    'components/AutoSizer',
    'components/AccessControlAction',
    'hooks/useAnimatedPresence',
    'hooks/useCancelAnimationsOnUnmount',
    'hooks/useEventListener',
    'hooks/useFloatingContainerContext',
    'hooks/useOnMountEffect',
    'hooks/useOutsideClickHandler',
    'hooks/usePageVisibility',
    'hooks/useResizeObserver',
    'hooks/useUploadFiles',
    'hooks/useWindowSize',
    'oauth/oauthClient',
    'ui/Button/ButtonPrimitives',
    'ui/Collapsible/lib/CollapsiblePrimitive',
    'ui/DropdownMenu/DropdownMenu',
    'ui/Label/Label',
    'ui/ListBox/ListBox',
    'ui/Menus/Menus',
    'ui/quill',
    'api',
    'api-error',
    'Chart',
    'colors',
    'constants',
    'internalMetrics',
    'posthog-typed',
    'logic/dataThemeLogic',
]

for (const p of paths) {
    const targetFile = path.join(libBase, p + '.ts')
    const targetDir  = path.dirname(targetFile)
    fs.mkdirSync(targetDir, { recursive: true })

    // Check if file exists in notebook-app
    const nbFile     = path.join(nbBase, p)
    const exists     = ['.ts', '.tsx', '/index.ts', '/index.tsx'].some(ext => fs.existsSync(nbFile + ext))

    // Calculate relative path from target file to notebook-app
    const relPath    = path.relative(targetDir, path.join(nbBase, p)).replace(/\\/g, '/')

    let content
    if (exists) {
        content = `export * from '${relPath}'\n`
        console.log('BRIDGE:', p)
    } else {
        content = `// Shim: lib/${p} not available\nexport const __shim = true\nexport default {} as any\n`
        console.log('SHIM:  ', p)
    }

    fs.writeFileSync(targetFile, content)
}

console.log('\nDone!')
