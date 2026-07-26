const fs = require('fs');
const code = fs.readFileSync('shims/gatsby.tsx', 'utf8');

const updated = code.replace(
    /if \(prop === 'totalCount' \|\| prop === 'count'\) {/,
    `if (prop === 'totalCount' || prop === 'count') {
                return 0
            }
            if (prop === 'sdks' || prop === 'frameworks' || prop === 'allSqueakTeam' || prop === 'allDestinations' || prop === 'allTeams' || prop === 'profiles' || prop === 'team' || prop === 'allSlackEmoji' || prop === 'allTeamsData' || prop === 'allAshbyJobPosting' || prop === 'allTeamSlugs') {
                return createMockQueryData()
            }`
);

fs.writeFileSync('shims/gatsby.tsx', updated);
