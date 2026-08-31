const fs = require('fs');
let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');

hostTs = hostTs.replace(/export function executeManageWindows\(\s*host: HostSnapshot \| undefined,\s*action: string,/g, 'export function executeManageWindows(\n    _host: HostSnapshot | undefined,\n    action: string,');
hostTs = hostTs.replace(/export function executeSetSystemAppearance\(\s*theme\?: string,/g, 'export function executeSetSystemAppearance(\n    _host: HostSnapshot | undefined,\n    theme?: string,');
hostTs = hostTs.replace(/export function executePublishToForum\(\s*title: string,/g, 'export function executePublishToForum(\n    _host: HostSnapshot | undefined,\n    title: string,');
hostTs = hostTs.replace(/export function executeCreateNotebook\(\s*title: string,/g, 'export function executeCreateNotebook(\n    _host: HostSnapshot | undefined,\n    title: string,');

fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);
