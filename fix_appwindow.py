import re

filepath = 'components/AppWindow/index.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Replace size="medium" with size="large" or just "large" or whatever makes it big in LemonButton.
# Wait, the user said "pencere taskbar kapatma butonu buyuk", which means "window taskbar close button is large".
# In AppWindow/index.tsx, the handleClose button used to be small probably. Let's check what it was before.
# OSButton default size was 'lg' unless specified. Oh, wait, in LemonButton, maybe it should be 'small' or 'xsmall' to fit the titlebar.
content = content.replace('<LemonButton\n                                                    size="medium"\n                                                    onClick={handleClose}', '<LemonButton\n                                                    size="xsmall"\n                                                    onClick={handleClose}')

with open(filepath, 'w') as f:
    f.write(content)
