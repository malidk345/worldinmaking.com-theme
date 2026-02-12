import fs from 'fs';

const filePath = 'node_modules/@posthog/icons/dist/posthog-icons.es.js';

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add import for jsx-runtime at the top
    if (!content.includes('react/jsx-runtime')) {
        content = 'import * as _jsxRuntime from "react/jsx-runtime";\n' + content;
    }

    // 2. Locate the jsxRuntime block and replace it
    const startMarker = 'var jsxRuntime = { exports: {} };';
    const endMarker = 'var jsxRuntimeExports = jsxRuntime.exports;';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
        // We replace everything between start and end inclusive
        const patch = 'var jsxRuntimeExports = _jsxRuntime;';
        const newContent = content.substring(0, startIndex) + patch + content.substring(endIndex + endMarker.length);
        fs.writeFileSync(filePath, newContent);
        console.log('Patched @posthog/icons successfully');
    } else {
        console.log('Could not find markers for patching');
    }
} else {
    console.log('File not found:', filePath);
}
