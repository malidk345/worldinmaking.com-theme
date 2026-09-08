import re

with open('src/components/AppWindow/index.tsx', 'r') as f:
    content = f.read()

# I already tried to replace MenuItem but my regex might have failed. Let's do it manually.
content = content.replace("import { MenuItem, useApp } from '../../context/App'", "import { useApp } from '../../context/App'")

# Let's remove lines 15-16 which might be the unused frostedSurfaces imports if they still exist.
# or I'll just check what is on line 15.
lines = content.split('\n')
for idx, line in enumerate(lines):
    if "import { MOTION_LAYER, WINDOW_BG } from '../../constants/frostedSurfaces'" in line:
        lines[idx] = ""

content = "\n".join(lines)

with open('src/components/AppWindow/index.tsx', 'w') as f:
    f.write(content)
