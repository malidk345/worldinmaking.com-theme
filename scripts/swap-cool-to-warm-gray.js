const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const pairs = [
    ['#F3F4F5', '#F3F4EF'],
    ['#f3f4f5', '#f3f4ef'],
    ['#E8EAED', '#EFF0EA'],
    ['#e8eaed', '#eff0ea'],
    ['#DDE1E6', '#E5E7DF'],
    ['#dde1e6', '#e5e7df'],
    ['#CDD2D8', '#DBDED4'],
    ['#cdd2d8', '#dbded4'],
    ['#C0C5CC', '#CFD0C8'],
    ['#c0c5cc', '#cfd0c8'],
]

const files = [
    'src/components/BrandLogos/index.tsx',
    'src/components/CodeBlock/theme.ts',
    'src/components/CommunityIncubatorForm.tsx',
    'src/components/SliderNav/index.js',
    'src/components/TapePlayer/MixtapeEditor.tsx',
    'src/components/Pricing/Overlays/SelfHost.tsx',
    'src/components/Pricing/Overlays/Enterprise.tsx',
    'src/templates/OG/tutorial.js',
    'src/templates/OG/job.js',
    'src/templates/OG/docs-handbook.js',
    'src/templates/OG/customer.js',
    'src/templates/OG/careers.js',
]

for (const rel of files) {
    const file = path.join(root, rel)
    if (!fs.existsSync(file)) continue
    let c = fs.readFileSync(file, 'utf8')
    let n = c
    for (const [a, b] of pairs) n = n.split(a).join(b)
    if (n !== c) {
        fs.writeFileSync(file, n)
    }
}
