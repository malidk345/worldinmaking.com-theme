const fs = require('fs');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove process.getBuiltinModule which is what Next.js is complaining about.
    const replacement = `
function nodeBuiltin<T>(name: string): T | null {
    // Next.js Edge runtime does not support process.getBuiltinModule and will error
    // even if it's behind a type check. We must avoid it completely.
    return null;
}
`;

    content = content.replace(/function nodeBuiltin[\s\S]*?catch \{\n        return null\n    \}\n\}/, replacement.trim());

    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('src/lib/bots/groq-key-cursor.ts');
