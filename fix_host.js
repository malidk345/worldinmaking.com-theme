const fs = require('fs');

let executeTs = fs.readFileSync('src/lib/bots/tools/execute.ts', 'utf8');
executeTs = executeTs.replace(/executeManageWindows\(args\.action, args\.path, args\.left_path, args\.right_path\)/g, 'executeManageWindows(host, args.action, args.path, args.left_path, args.right_path)');
fs.writeFileSync('src/lib/bots/tools/execute.ts', executeTs);

let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');
hostTs = hostTs.replace(/export function executeManageWindows\(\s*host: HostSnapshot \| undefined,\s*action: string,/g, 'export function executeManageWindows(\n    _host: HostSnapshot | undefined,\n    action: string,');
fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);
