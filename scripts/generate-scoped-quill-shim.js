/**
 * Quill shim stub.
 * WorldInMaking uses custom ContentEditable MarkdownNotebook and LemonTable.
 * Quill styling is not needed and its Tailwind v4 tokens polluted global scopes.
 */
const fs = require('fs')
const path = require('path')

const destPath = path.resolve(__dirname, '../src/notebook-app/styles/quill-shim.css')
fs.writeFileSync(destPath, '/* quill-shim disabled: not needed for LemonTable or MarkdownNotebook */\n')
console.log('Quill shim stubbed.')

