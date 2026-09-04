import os

with open("src/components/AppWindow/index.tsx") as f:
    content = f.read()

# Let's extract toggleExpanded into useWindowActions.ts
