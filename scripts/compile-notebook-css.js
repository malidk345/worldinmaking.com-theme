/**
 * Compiles bundle.scss into bundleCss.ts exporting NOTEBOOK_APP_CSS string.
 */
const fs = require('fs')
const path = require('path')
const sass = require('sass')

const bundleScssPath = path.resolve(__dirname, '../src/notebook-app/styles/bundle.scss')
const bundleTsPath = path.resolve(__dirname, '../src/notebook-app/styles/bundleCss.ts')

try {
    const result = sass.compile(bundleScssPath, { style: 'expanded' })
    const cssContent = result.css.toString()
    const tsContent = `// Auto-generated notebook CSS string\nexport const NOTEBOOK_APP_CSS = ${JSON.stringify(cssContent)};\n`
    fs.writeFileSync(bundleTsPath, tsContent)
    console.log('Successfully compiled bundle.scss to bundleCss.ts (length:', cssContent.length, ')')
} catch (e) {
    console.error('Error compiling notebook CSS:', e)
    process.exit(1)
}
