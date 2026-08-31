const fs = require('fs');

let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');
hostTs = hostTs.replace(/export function executeCreateNotebook\(host: HostSnapshot \| undefined, title: string, content\?: string\): \{/g, 'export function executeCreateNotebook(_host: HostSnapshot | undefined, title: string, content?: string): {');
fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);
