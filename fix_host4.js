const fs = require('fs');
let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');

hostTs = hostTs.replace(/export function executeManageWindows\(\s*host: HostSnapshot \| undefined,\s*action: string,/g, 'export function executeManageWindows(\n    _host: HostSnapshot | undefined,\n    action: string,');
fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);
