import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENTS_DIR = path.join(process.cwd(), 'contents')

export interface MDXPost {
    slug: string
    frontmatter: Record<string, any>
    content: string
}

export function getMdxBySlug(contentType: string, slug: string[]): MDXPost | null {
    const slugPath = slug.join('/')
    const possiblePaths = [
        path.join(CONTENTS_DIR, contentType, `${slugPath}.mdx`),
        path.join(CONTENTS_DIR, contentType, slugPath, 'index.mdx'),
        path.join(CONTENTS_DIR, `${slugPath}.mdx`),
    ]

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8')
            const { data, content } = matter(fileContent)
            return {
                slug: slugPath,
                frontmatter: data,
                content,
            }
        }
    }
    return null
}

export function getAllMdxSlugs(contentType: string): string[][] {
    const targetDir = path.join(CONTENTS_DIR, contentType)
    if (!fs.existsSync(targetDir)) return []

    const slugs: string[][] = []

    function walkDir(currentDir: string, currentSlug: string[]) {
        const files = fs.readdirSync(currentDir)
        for (const file of files) {
            const fullPath = path.join(currentDir, file)
            const stat = fs.statSync(fullPath)

            if (stat.isDirectory()) {
                walkDir(fullPath, [...currentSlug, file])
            } else if (file.endsWith('.mdx')) {
                const name = file.replace(/\.mdx$/, '')
                if (name === 'index') {
                    slugs.push(currentSlug)
                } else {
                    slugs.push([...currentSlug, name])
                }
            }
        }
    }

    walkDir(targetDir, [])
    return slugs
}
