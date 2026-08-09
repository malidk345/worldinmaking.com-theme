# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> WorldInMaking Shell Smoke Suite >> Login route (/login) opens auth portal
- Location: tests\smoke.spec.ts:14:9

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
            - generic [ref=e32]: "2"
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
        - generic:
          - dialog / [ref=e106]:
            - generic [ref=e107]:
              - button "Minimize window" [ref=e111] [cursor=pointer]
              - button "Maximize window" [ref=e118] [cursor=pointer]
              - button [ref=e125] [cursor=pointer]
            - generic [ref=e132]:
              - generic [ref=e134]:
                - tablist [ref=e135]:
                  - tab "Install with AI" [selected] [ref=e136] [cursor=pointer]
                  - tab "Web signup" [ref=e137] [cursor=pointer]
                - generic [ref=e138]:
                  - text: Need help?
                  - link "Talk to a human" [ref=e140] [cursor=pointer]:
                    - /url: /talk-to-a-human
              - tabpanel "Install with AI" [ref=e145]:
                - generic [ref=e150]:
                  - heading "Install with AI in a single prompt" [level=3] [ref=e151]
                  - paragraph [ref=e152]: Paste into your terminal or code editor and make AI do the work.
                  - paragraph [ref=e153]:
                    - text: Not into AI?
                    - button "Sign up the old fashioned way." [ref=e154] [cursor=pointer]
          - dialog "/login" [active] [ref=e162]:
            - generic [ref=e163]:
              - button "Minimize window" [ref=e167] [cursor=pointer]
              - button "Maximize window" [ref=e174] [cursor=pointer]
              - button [ref=e181] [cursor=pointer]
            - generic [ref=e185]: Opening sign in window...
      - complementary [ref=e198]:
        - button "Expand OS Toolbar" [ref=e201] [cursor=pointer]
      - generic [ref=e206]:
        - button "Close modal" [ref=e207] [cursor=pointer]
        - generic [ref=e210]:
          - heading "Sign in to WorldInMaking" [level=4] [ref=e211]
          - paragraph [ref=e212]: Access your notebooks, forum posts, and philosopher AI settings.
        - group "Authentication" [ref=e213]:
          - radio "Login" [checked] [ref=e214] [cursor=pointer]
          - radio "Signup" [ref=e215] [cursor=pointer]
        - generic [ref=e216]:
          - generic [ref=e217]:
            - generic [ref=e218]: Email address *
            - textbox "you@example.com" [ref=e219]
          - generic [ref=e220]:
            - generic [ref=e221]: Password *
            - textbox "••••••••" [ref=e222]
          - generic [ref=e223]:
            - button "Login" [ref=e224] [cursor=pointer]
            - button "Send magic login link" [ref=e226] [cursor=pointer]
            - button "Forgot password?" [ref=e228] [cursor=pointer]
    - region "Notifications (F8)":
      - list [ref=e230]:
        - listitem [ref=e231]:
          - generic [ref=e232]:
            - generic [ref=e233]: World In Making
            - paragraph [ref=e235]: We do not track you. There are no cookies, no accept buttons. Just experience.
  - alert [ref=e237]
  - status [ref=e238]
```