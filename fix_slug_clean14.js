const fs = require('fs')
let code = fs.readFileSync('src/pages/[...slug].tsx', 'utf8')
code = code.replace(/: any\) \{\n    const slugArray = Array.isArray\(params\?\.slug\) \? params\.slug : \[String\(params\?\.slug \|\| ''\)\]\n    return \{\n        props: \{\n            slugArray,\n        \},\n    \}\n\}/, '')
fs.writeFileSync('src/pages/[...slug].tsx', code, 'utf8')
