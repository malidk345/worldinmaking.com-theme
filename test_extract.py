import re

with open("src/components/AppWindow/index.tsx", "r") as f:
    code = f.read()

print("File size:", len(code))
