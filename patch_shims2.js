const fs = require('fs');
const code = fs.readFileSync('shims/gatsby.tsx', 'utf8');

const updated = code.replace(
    /return new Proxy\(\{\}, handler\)/,
    `if (prop === 'aiResearchTeam' || prop === 'researchTeamMembers') {
                return createMockQueryData()
            }
            return new Proxy({}, handler)`
);

fs.writeFileSync('shims/gatsby.tsx', updated);
