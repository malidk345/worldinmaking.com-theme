const fs = require('fs');
let executeTs = fs.readFileSync('src/lib/bots/tools/execute.ts', 'utf8');

executeTs = executeTs.replace(/executeManageWindows\(args\.action, args\.path, args\.left_path, args\.right_path\)/g, 'executeManageWindows(host, args.action, args.path, args.left_path, args.right_path)');
executeTs = executeTs.replace(/executeCreateNotebook\(asText\(args\.title, 80\), asText\(args\.content, 8_000\)\)/g, 'executeCreateNotebook(host, asText(args.title, 80), asText(args.content, 8_000))');
executeTs = executeTs.replace(/executeSetSystemAppearance\(\s*asText\(args\.theme, 20\),\s*asText\(args\.wallpaper, 60\),\s*typeof args\.reduce_transparency === 'boolean' \? args\.reduce_transparency : undefined\s*\)/g, "executeSetSystemAppearance(host, asText(args.theme, 20), asText(args.wallpaper, 60), typeof args.reduce_transparency === 'boolean' ? args.reduce_transparency : undefined)");
executeTs = executeTs.replace(/executePublishToForum\(\s*asText\(args\.title, 140\),\s*asText\(args\.content \|\| args\.body, 12_000\),\s*asText\(args\.category \|\| args\.tag, 40\)\s*\)/g, "executePublishToForum(host, asText(args.title, 140), asText(args.content || args.body, 12_000), asText(args.category || args.tag, 40))");

fs.writeFileSync('src/lib/bots/tools/execute.ts', executeTs);


let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');
hostTs = hostTs.replace(/export function executeManageWindows\(\s*host: HostSnapshot \| undefined,\s*action: string,/g, 'export function executeManageWindows(\n    _host: HostSnapshot | undefined,\n    action: string,');
hostTs = hostTs.replace(/export function executeCreateNotebook\(title: string, content\?: string\): \{/g, 'export function executeCreateNotebook(_host: HostSnapshot | undefined, title: string, content?: string): {');
hostTs = hostTs.replace(/export function executeSetSystemAppearance\(\s*theme\?: string,/g, 'export function executeSetSystemAppearance(\n    _host: HostSnapshot | undefined,\n    theme?: string,');
hostTs = hostTs.replace(/export function executePublishToForum\(\s*title: string,/g, 'export function executePublishToForum(\n    _host: HostSnapshot | undefined,\n    title: string,');

fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);
