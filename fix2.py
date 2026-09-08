import re

with open('src/components/AppWindow/index.tsx', 'r') as f:
    content = f.read()

# Fix destructured vars
# From: const { activeInternalMenu } = useWindowMenu(item, appMenu, setMenu)
# To: const { activeInternalMenu, setActiveInternalMenu, menu: internalMenu, parent } = useWindowMenu(item, appMenu, setMenu)
# Wait, I didn't export `parent` from useWindowMenu. Let's fix useWindowMenu to export parent too.

with open('src/hooks/useWindowMenu.ts', 'r') as f:
    menu_content = f.read()

menu_content = menu_content.replace(
    "return { activeInternalMenu, setActiveInternalMenu, menu: internalMenu }",
    "return { activeInternalMenu, setActiveInternalMenu, menu: internalMenu, parent }"
)

with open('src/hooks/useWindowMenu.ts', 'w') as f:
    f.write(menu_content)

# Update destructured
content = content.replace(
    "const { activeInternalMenu } = useWindowMenu(item, appMenu, setMenu)",
    "const { activeInternalMenu, setActiveInternalMenu, menu: internalMenu, parent } = useWindowMenu(item, appMenu, setMenu)"
)

with open('src/components/AppWindow/index.tsx', 'w') as f:
    f.write(content)
