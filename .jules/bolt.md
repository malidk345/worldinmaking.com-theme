## 2024-05-14 - Replace `.map().includes()` with `.some()`
**Learning:** Found an instance in `src/templates/merch/store.ts` where `cartItems.map((item) => item.shopifyId).includes(cartItem.shopifyId)` was used to check for existence in a Zustand store update. This creates a redundant intermediate array allocation and iterates multiple times, resulting in O(N) memory and time overhead.
**Action:** Always prefer `.some()` (e.g., `cartItems.some(item => item.shopifyId === cartItem.shopifyId)`) over `.map().includes()` to prevent unnecessary memory churn and allow early short-circuiting.
