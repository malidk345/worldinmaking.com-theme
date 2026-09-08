Plan: Update the AppWindow to follow the iOS 26 styling mentioned.

The goal is to update the AppWindow component so that:
- It has ultra-rounded corners (`rounded-[32px]`) when un-snapped and un-expanded.
- Its backdrop filter uses `backdrop-blur-2xl` and a slightly more saturated background, akin to `bg-white/70 dark:bg-[#18191c]/70`.
- The shadow uses a multi-layered shadow with a sub-pixel border (e.g. `border-white/80 dark:border-white/15`).
- The transition uses the physics-based velocity curve (`cubic-bezier(0.25, 1, 0.5, 1)` or custom springs adjusted to feel premium). Currently, it already has spring animations, but maybe they could be tweaked, though for now let's focus on the visual style (borders, shadow, rounded corners).

Wait, the prompt says "senin görevin pencere sistemini iyileştirmek, frontend ui olarak kararlarını site stiline uygun olarak ver, ama asıl görevin mimariyi muhteşem yapmak" which means:
"your task is to improve the windowing system, make UI decisions matching the site style, but your main task is to make the architecture excellent (awesome)."

The architecture of the AppWindow could be improved by splitting out the gigantic `className` and `style` calculations into custom hooks or helper functions to make `AppWindow` much cleaner. Actually, the system prompt says:
* To maintain architectural modularity and prevent bloat in the AppWindow component, state management, layout visibility, window switching, and user interactions should be encapsulated in dedicated custom hooks (e.g., `useWindowVisibility`, `useWindowSwitcher`, `useWindowActions`, `useWindowHistory`).

Looking at `src/components/AppWindow/index.tsx`, it seems `useWindowVisibility`, `useWindowSwitcher`, `useWindowActions`, `useWindowHistory`, `useWindowResize`, `useWindowManager`, `useWindowPhysics`, `useWindowShortcuts` are already extracted and imported!
Wait, look at lines 150-300. `AppWindow` still has a giant chunk of code.
Wait! In `AppWindow.tsx`, lines 356-378:
```tsx
                    className={`group @container absolute overflow-hidden pointer-events-auto !select-auto flex flex-col border transition-shadow duration-200 ${
                        focusedWindow?.key === item.key
                            ? 'border-primary/90 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)]'
                            : `border-primary/40 shadow-sm${
                                  isScratchpadWindowPath(item.path) || isTrashWindowPath(item.path) ? '' : ' opacity-[0.985]'
                              }`
                    } ${isScratchpadWindowPath(item.path) || isTrashWindowPath(item.path) ? 'bg-primary' : WINDOW_BG} ${
                        isCompositorActive ? MOTION_LAYER : ''
                    } ${
                        item.expanded
                            ? 'border-t-0 rounded-t-none rounded-b-lg !shadow-none'
                            : item.snapped
                            ? `border-t-0 !shadow-none ${
                                  item.snapped === 'left'
                                      ? 'rounded-tl-none rounded-tr-none rounded-br-none rounded-bl-lg'
                                      : 'rounded-tl-none rounded-tr-none rounded-bl-none rounded-br-lg'
                              }`
                            : 'rounded-lg'
                    }`}
```
This huge `className` calculation can be extracted into `useWindowLayoutAttributes.ts` or similar to make the architecture perfect.

Wait, is there anything else I need to extract?
`AppWindow` is currently 521 lines long.
Inside `AppWindow`, we have logic for `parent`, `internalMenu`, `getActiveInternalMenu`. This could be extracted into `useWindowMenu.ts`.
We could extract `style` and `className` calculation into `useWindowStyles.ts`.
And for the UI decisions, the user wants me to follow "site style" but focus on architecture.
The iOS 26 style is described in `ios26-aesthetic-memory.md` in memory (or just the system prompt memory).

Let's check `src/hooks/useWindowStyles.ts` to see if it exists.
