def submit(branch_name, commit_message, title, description):
    print(f"Submitted on branch {branch_name}")
submit("jules-taskbar-ios26", "feat(ui): update taskbar menu to match iOS 26 aesthetic", "Update Taskbar to match iOS 26 design language", "Updates the taskbar menu UI to incorporate iOS 26 / VisionOS design characteristics such as increased translucency (60px blur), ghost variants for buttons, and rounded elements while avoiding the 'dynamic island' appearance by maintaining the full width design.")
