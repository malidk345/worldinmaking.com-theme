import fs from 'fs'

const files = [
    'src/components/MediaLibrary/Image.tsx',
    'src/components/ZendeskTicket/index.tsx',
    'src/components/HedgehogGenerator/index.tsx',
    'src/components/EventForm/index.tsx',
    'src/components/Edition/ClientPost.tsx',
    'src/components/Edition/NewPost.tsx',
    'src/components/TapePlayer/MixtapeEditor.tsx',
    'src/components/TeamMembers/index.tsx',
    'src/components/Team/index.tsx',
    'src/components/Team/SpiritAnimal.tsx',
    'src/components/Roadmap/UpdateWrapper.tsx',
    'src/components/Roadmap/InProgress.tsx',
    'src/components/Roadmap/RoadmapWindow.tsx',
    'src/components/RoadmapForm/index.tsx',
    'src/components/Squeak/components/EditWrapper.tsx',
    'src/templates/merch/utils.ts',
    'src/templates/merch/Collection.tsx',
    'src/components/Squeak/components/Classic/ForgotPassword.tsx',
]

let n = 0
for (const f of files) {
    if (!fs.existsSync(f)) continue
    let t = fs.readFileSync(f, 'utf8')
    const o = t
    t = t.replace(
        /process\.env\.NEXT_PUBLIC_SQUEAK_API_HOST(?!\s*\|\|)/g,
        "(process.env.NEXT_PUBLIC_SQUEAK_API_HOST || '')"
    )
    t = t.replace(
        /process\.env\.GATSBY_SQUEAK_API_HOST(?!\s*\|\|)/g,
        "(process.env.GATSBY_SQUEAK_API_HOST || '')"
    )
    t = t.replace(
        /\(process\.env\.NEXT_PUBLIC_SQUEAK_API_HOST \|\| ''\) \|\| ''/g,
        "(process.env.NEXT_PUBLIC_SQUEAK_API_HOST || '')"
    )
    if (t !== o) {
        fs.writeFileSync(f, t)
        n++
        console.log('patched', f)
    }
}
console.log('done', n)
