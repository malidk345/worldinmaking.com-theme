const fs = require('fs');

let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');
hostTs = hostTs.replace(/export function executeReadNotebook\(\s*_host: HostSnapshot \| undefined,\s*/g, 'export function executeReadNotebook(\n    host: HostSnapshot | undefined,\n    ');
hostTs = hostTs.replace(/export function executeCreateNotebook\(_host: HostSnapshot \| undefined, title: string, content\?: string\): \{/g, 'export function executeCreateNotebook(_host: HostSnapshot | undefined, title: string, content?: string): {');
fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);
