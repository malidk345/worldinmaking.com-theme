const fs = require('fs')
const path = require('path')

// Replace olive/beige PostHog-3000-ish neutrals with true warm-gray steps.
const pairs = [
    ['#EFF0EA', '#E9EAE5'],
    ['#eff0ea', '#e9eae5'],
    ['#E5E7DF', '#DFE0DB'],
    ['#e5e7df', '#dfe0db'],
    ['#E5E7E0', '#DFE0DB'],
    ['#e5e7e0', '#dfe0db'],
    ['#EEEFE9', '#E9EAE5'],
    ['#eeefe9', '#e9eae5'],
    ['#DBDED4', '#D5D6D1'],
    ['#dbded4', '#d5d6d1'],
    ['#DADBD2', '#D0D1CC'],
    ['#dadbd2', '#d0d1cc'],
    ['#CFD0C8', '#CBCCC7'],
    ['#cfd0c8', '#cbccc7'],
    ['#C5C7BD', '#C1C2BD'],
    ['#c5c7bd', '#c1c2bd'],
    ['#B9BBAF', '#B7B8B3'],
    ['#b9bbaf', '#b7b8b3'],
    ['#ABAD9F', '#A8A9A4'],
    ['#abad9f', '#a8a9a4'],
    ['#939583', '#7A7B76'],
    ['#939583', '#7a7b76'],
]

const root = path.resolve(__dirname, '..')
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
