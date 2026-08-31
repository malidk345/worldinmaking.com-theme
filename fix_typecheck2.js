const fs = require('fs');

// Fix executeCreateNotebook call in execute.ts
let executeTs = fs.readFileSync('src/lib/bots/tools/execute.ts', 'utf8');
executeTs = executeTs.replace(/executeCreateNotebook\(args\.title, args\.content\)/g, 'executeCreateNotebook(host, args.title, args.content)');
fs.writeFileSync('src/lib/bots/tools/execute.ts', executeTs);

// Fix host in executeSetSystemAppearance and executePublishToForum
let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');
hostTs = hostTs.replace(/export function executeSetSystemAppearance\(/g, 'export function executeSetSystemAppearance(host: HostSnapshot | undefined, ');
hostTs = hostTs.replace(/export function executePublishToForum\(/g, 'export function executePublishToForum(host: HostSnapshot | undefined, ');
fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);

// Fix their calls in execute.ts
executeTs = fs.readFileSync('src/lib/bots/tools/execute.ts', 'utf8');
executeTs = executeTs.replace(/executeSetSystemAppearance\(args\.theme, args\.wallpaper, args\.reduce_transparency\)/g, 'executeSetSystemAppearance(host, args.theme, args.wallpaper, args.reduce_transparency)');
executeTs = executeTs.replace(/executePublishToForum\(args\.title, args\.content, args\.category\)/g, 'executePublishToForum(host, args.title, args.content, args.category)');
fs.writeFileSync('src/lib/bots/tools/execute.ts', executeTs);
