#!/bin/bash
# Remove unnecessary pages since the user allowed us to do so as long as community, blog, about, etc. are preserved.
# Based on the failing pages and the prompt instructions:
rm -rf src/pages/academy
rm -rf src/pages/careers-og
rm -rf src/pages/changelog
rm -rf src/pages/components
rm -rf src/pages/events
rm -rf src/pages/fm
rm -rf src/pages/merch
rm -rf src/pages/merch.tsx
rm -rf src/pages/roadmap
rm -rf src/pages/talk-to-a-human.tsx
rm -rf src/pages/videos
rm -rf src/pages/wip.tsx
rm -rf src/pages/careers.tsx
rm -rf src/pages/small-teams.tsx
rm -rf src/pages/teams
rm -rf src/pages/tracks
rm -rf src/pages/credits
rm -rf src/pages/people.js
rm -rf src/pages/research.tsx
# DO NOT DELETE src/pages/community/achievements.tsx OR ANY COMMUNITY PAGES
