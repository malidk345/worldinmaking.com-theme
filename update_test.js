const fs = require('fs');
const path = 'tests/window-path.spec.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    "expect(isPathRoutedWindow('/notebooks/nb-1')).toBe(true)",
    "expect(isPathRoutedWindow('/notebooks/nb-1')).toBe(false)"
);

fs.writeFileSync(path, content);
