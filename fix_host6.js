const fs = require('fs');

let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');
hostTs = hostTs.replace(/export function executeReadNotebook\(\s*host: HostSnapshot \| undefined,\s*/g, 'export function executeReadNotebook(\n    _host: HostSnapshot | undefined,\n    ');
hostTs = hostTs.replace(/export function executeSetSystemAppearance\(\s*host: HostSnapshot \| undefined,\s*/g, 'export function executeSetSystemAppearance(\n    _host: HostSnapshot | undefined,\n    ');
hostTs = hostTs.replace(/export function executePublishToForum\(\s*host: HostSnapshot \| undefined,\s*/g, 'export function executePublishToForum(\n    _host: HostSnapshot | undefined,\n    ');
fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);
