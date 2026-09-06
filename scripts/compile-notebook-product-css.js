/**
 * Compiles product-bundle.scss (LemonTable + editor only) into productBundleCss.ts.
 * Unbinds nested :root / :host so variables bind to .notebook-app-scope.
 */
const fs = require('fs')
const path = require('path')
const sass = require('sass')

const bundleScssPath = path.resolve(__dirname, '../src/notebook-app/styles/product-bundle.scss')
const bundleTsPath = path.resolve(__dirname, '../src/notebook-app/styles/productBundleCss.ts')

try {
    const result = sass.compile(bundleScssPath, { style: 'expanded' })
    let cssContent = result.css.toString()
    cssContent = cssContent.replace(/@import\s+['"]quill-shim\.css['"]\s*;?/g, '')
    const quillPath = path.resolve(__dirname, '../src/notebook-app/styles/quill-shim.css')
    if (fs.existsSync(quillPath)) {
        cssContent = fs.readFileSync(quillPath, 'utf8') + '\n' + cssContent
    }
    cssContent = cssContent.replace(/\.notebook-app-scope\s+(?::root|:host)/g, '.notebook-app-scope')

    const PORTAL_ROOT =
        String.raw`\.(?:Popover|LemonModal|LemonPopover|LemonMenu|ReactModal|Tooltip)(?:--[\w-]+)?(?![A-Za-z0-9_])`
    const COMPOUND = String.raw`${PORTAL_ROOT}(?:\.[^\s,>+~{\[:]+)*(?:\[[^\]]*\])*`
    const CHAIN_TAIL = String.raw`(?:\s*[>+~\s]\s*[^\s,{]+)*`
    const portalRewrite = new RegExp(String.raw`\.notebook-app-scope\s+(${COMPOUND}${CHAIN_TAIL})`, 'g')
    cssContent = cssContent.replace(portalRewrite, (match, rest) => {
        const m = rest.match(/^(\.[^\s,>+~{]+)([\s\S]*)$/)
        if (!m) return match
        const first = m[1]
        const tail = m[2] || ''
        if (first.includes('notebook-app-scope')) return match
        return `.notebook-app-scope ${first}${tail}, ${first}.notebook-app-scope${tail}`
    })

    const tsContent = `// Auto-generated slim notebook product CSS\nexport const NOTEBOOK_PRODUCT_CSS = ${JSON.stringify(
        cssContent
    )};\n`
    fs.writeFileSync(bundleTsPath, tsContent)
    console.log('Successfully compiled product-bundle.scss to productBundleCss.ts (length:', cssContent.length, ')')
} catch (e) {
    console.error('Error compiling notebook product CSS:', e)
    process.exit(1)
}
