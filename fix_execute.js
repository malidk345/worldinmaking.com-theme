const fs = require('fs');
let executeTs = fs.readFileSync('src/lib/bots/tools/execute.ts', 'utf8');

executeTs = executeTs.replace(/executeManageWindows\(args\.action, args\.path, args\.left_path, args\.right_path\)/g, 'executeManageWindows(host, args.action, args.path, args.left_path, args.right_path)');
executeTs = executeTs.replace(/executeSetSystemAppearance\(args\.theme, args\.wallpaper, args\.reduce_transparency\)/g, 'executeSetSystemAppearance(host, args.theme, args.wallpaper, args.reduce_transparency)');
executeTs = executeTs.replace(/executePublishToForum\(args\.title, args\.content, args\.category\)/g, 'executePublishToForum(host, args.title, args.content, args.category)');
executeTs = executeTs.replace(/executeCreateNotebook\(args\.title, args\.content\)/g, 'executeCreateNotebook(host, args.title, args.content)');

fs.writeFileSync('src/lib/bots/tools/execute.ts', executeTs);
