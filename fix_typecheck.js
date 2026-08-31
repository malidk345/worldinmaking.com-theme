const fs = require('fs');

// Fix chat-remote.ts
let chatRemote = fs.readFileSync('src/lib/chat-remote.ts', 'utf8');
chatRemote = chatRemote.replace(/AUTH_USER_ID_KEY/g, "'wim_auth_uid'");
fs.writeFileSync('src/lib/chat-remote.ts', chatRemote);

// Fix chat.ts
let chatTs = fs.readFileSync('src/pages/api/chat.ts', 'utf8');
chatTs = chatTs.replace(/, envFrom/g, '');
fs.writeFileSync('src/pages/api/chat.ts', chatTs);

// Fix host.ts
let hostTs = fs.readFileSync('src/lib/bots/tools/host.ts', 'utf8');
hostTs = hostTs.replace(/export function executeCreateNotebook\(title: string, content\?: string\): \{/g, 'export function executeCreateNotebook(host: HostSnapshot | undefined, title: string, content?: string): {');
fs.writeFileSync('src/lib/bots/tools/host.ts', hostTs);

// Fix tool action types (in host.ts and chat.ts and co-author.ts)
const typeDef = `type:
                  | 'open_window'
                  | 'manage_windows'
                  | 'set_system_appearance'
                  | 'annotate_notebook'
                  | 'publish_to_forum'
                  | 'create_notebook'
                  | 'create_forum_topic'
                  | 'insert_notebook_block'
                  | 'rewrite_notebook_document'
                  | 'replace_notebook_selection'
                  | 'update_notebook_title'`;

let aiContracts = fs.readFileSync('src/lib/ai/contracts.ts', 'utf8');
aiContracts = aiContracts.replace(/type:\s*\|\s*'open_window'[^]*?\| 'update_notebook_title'/g, typeDef);
fs.writeFileSync('src/lib/ai/contracts.ts', aiContracts);
