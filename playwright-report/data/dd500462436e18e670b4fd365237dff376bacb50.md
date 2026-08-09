# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> WorldInMaking Shell Smoke Suite >> Root route loads desktop shell
- Location: tests\smoke.spec.ts:4:9

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e7]:
        - link "worldinmaking home" [ref=e10] [cursor=pointer]:
          - /url: /
          - img "WorldInMaking Logo" [ref=e11]
        - complementary [ref=e15]:
          - button [ref=e18] [cursor=pointer]
          - button [ref=e24] [cursor=pointer]
          - button "Active windows (1)" [ref=e29] [cursor=pointer]:
            - generic [ref=e32]: "1"
          - menubar [ref=e33]:
            - menuitem [ref=e34] [cursor=pointer]
      - generic [ref=e37]:
        - generic:
          - generic:
            - navigation:
              - generic:
                - list [ref=e38]:
                  - listitem [ref=e39]:
                    - figure [ref=e42]:
                      - link "Community" [ref=e44] [cursor=pointer]:
                        - /url: /community
                  - listitem [ref=e50]:
                    - figure [ref=e53]:
                      - link "Notebooks" [ref=e55] [cursor=pointer]:
                        - /url: /notebooks
                - list [ref=e61]:
                  - listitem [ref=e62]:
                    - figure [ref=e65]:
                      - link "Archive" [ref=e67] [cursor=pointer]:
                        - /url: /archive
                  - listitem [ref=e73]:
                    - figure [ref=e76]:
                      - link "Contact" [ref=e78] [cursor=pointer]:
                        - /url: /contact
                  - listitem [ref=e84]:
                    - figure [ref=e87]:
                      - link "Display Options" [ref=e89] [cursor=pointer]:
                        - /url: /display-options
                  - listitem [ref=e95]:
                    - figure [ref=e98]:
                      - link "Trash" [ref=e100] [cursor=pointer]:
                        - /url: /trash
        - dialog / [active] [ref=e106]:
          - generic [ref=e107]:
            - button "Minimize window" [ref=e111] [cursor=pointer]
            - button "Maximize window" [ref=e118] [cursor=pointer]
            - button [ref=e125] [cursor=pointer]
          - generic [ref=e135]:
            - generic [ref=e136]:
              - generic [ref=e137]: PostHog
              - generic [ref=e138]: A fatal exception 404 has occurred at 0028:C0011E36 in VXD PostHog(01)
              - generic [ref=e139]: + 00010E36. The current application will be terminated.
            - link "* Press Esc to close this application" [ref=e141] [cursor=pointer]:
              - /url: /
            - generic [ref=e142]:
              - generic [ref=e143]: "[1] Documentation"
              - generic [ref=e144]: "[2] Community Support"
              - generic [ref=e145]: "[3] Blog"
              - generic [ref=e146]: "[4] Tutorials"
            - generic [ref=e147]:
              - generic [ref=e148]: "System ID: HEDGEHOG_NOT_FOUND"
              - generic [ref=e149]: "Error Code: 0x000404HOG"
              - generic [ref=e150]: "Component: POSTHOG.COM"
              - generic [ref=e151]: "Version: 1.0.awesome"
              - generic [ref=e152]: "Thread: Hedgehog#1 (Primary Analytics Thread)"
              - generic [ref=e153]: "Extra Info: The hedgehog has wandered off to analyze some data"
            - generic [ref=e154]:
              - generic [ref=e155]: "Call Stack:"
              - generic [ref=e156]: 0x001337 - feature_flags.check_existence()
              - generic [ref=e157]: 0x002020 - session_replay.find_recording()
              - generic [ref=e158]: 0x003030 - product_analytics.track_event()
              - generic [ref=e159]: 0x004040 - experiments.run_test()
              - generic [ref=e160]: 0x005050 - surveys.collect_feedback()
              - generic [ref=e161]: 0x006060 - data_warehouse.query_everything()
              - generic [ref=e162]: 0x007070 - cdp.process_data()
              - generic [ref=e163]: 0x008080 - web_analytics.count_visitors()
              - generic [ref=e164]: 0x009090 - error_tracking.catch_bugs()
              - generic [ref=e165]: 0x00A0A0 - page_not_found.display_hedgehog()
            - generic [ref=e166]:
              - generic [ref=e167]: "Memory Dump:"
              - generic [ref=e168]: 00000000 48 65 64 67 65 68 6F 67 20 69 73 20 6C 6F 73 74 |Hedgehog is lost|
              - generic [ref=e169]: 00000010 20 69 6E 20 74 68 65 20 64 61 74 61 20 77 61 72 | in the data war|
              - generic [ref=e170]: 00000020 65 68 6F 75 73 65 20 61 6E 64 20 63 61 6E 27 74 |ehouse and can't|
              - generic [ref=e171]: 00000030 20 66 69 6E 64 20 79 6F 75 72 20 70 61 67 65 21 | find your page!|
            - generic [ref=e172]:
              - generic [ref=e173]: "SYSTEM RECOVERY OPTIONS:"
              - generic [ref=e174]: "Initialize search protocol to locate missing data:"
              - generic [ref=e176]:
                - generic [ref=e177]: C:\SEARCH>
                - generic [ref=e178]:
                  - generic [ref=e181]:
                    - combobox "Search worldinmaking.com..." [ref=e184]
                    - button [disabled] [ref=e186]
                  - generic [ref=e190]: _
              - generic [ref=e191]: "Search includes: Documentation, API references, Tutorials, Blog posts, Community Q&A, and Company handbook. Error recovery success rate: 98.3%"
            - generic [ref=e192]:
              - generic [ref=e193]: "If this problem persists, contact your system administrator or:"
              - generic [ref=e194]:
                - text: "- File a bug report at"
                - link "github.com/PostHog/posthog.com/issues" [ref=e195] [cursor=pointer]:
                  - /url: https://github.com/PostHog/posthog.com/issues
              - generic [ref=e196]: "- Email us at hey@posthog.com"
              - generic [ref=e197]: "- Tweet at us @PostHog"
            - generic [ref=e198]: System halted. Press Esc to continue
      - complementary [ref=e206]:
        - button "Expand OS Toolbar" [ref=e209] [cursor=pointer]
    - region "Notifications (F8)":
      - list [ref=e213]:
        - listitem [ref=e214]:
          - generic [ref=e215]:
            - generic [ref=e216]: World In Making
            - paragraph [ref=e218]: We do not track you. There are no cookies, no accept buttons. Just experience.
  - alert [ref=e220]
  - status [ref=e221]
```