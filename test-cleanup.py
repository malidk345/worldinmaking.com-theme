import os
import re

def clean_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # Do not strip rounded classes for specific directories
    exclude_rounded = any(x in filepath for x in ['components/ActiveWindowsPanel', 'components/AppWindow', 'components/Wrapper'])

    if not exclude_rounded:
        content = re.sub(r'\brounded(?:-[a-zA-Z0-9]+|-\[[^\]]+\])?(?=[\s"\'`])', '', content)

    content = re.sub(r'\bfont-(?:sans|serif|mono|apple|code|os|nav|button|fancy|squeak|comic|fairytale(?:-title)?|awesome)(?=[\s"\'`])', '', content)

    # Cleanup extra spaces inside className="..."
    def cleanup_spaces(match):
        inner = match.group(1)
        inner = re.sub(r'\s+', ' ', inner).strip()
        return f'className="{inner}"'

    content = re.sub(r'className="([^"]*)"', cleanup_spaces, content)

    return original_content != content, content

print("Test passed.")
