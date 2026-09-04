with open("src/components/AppWindow/index.tsx") as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "function AppWindow({" in line:
            print(f"AppWindow start: {i}")
