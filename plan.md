1. Address the PR comment: "editor mobil uyumlu degil biraz daha kompakt olsun" (editor is not mobile friendly, make it more compact).
2. I need to make the `CommentForm` and `CommentSection` more compact on mobile devices.
3. In `CommentSection.tsx`:
   - Adjust paddings on the main wrapper `p-4 md:p-6` might be okay, maybe `p-3 md:p-6` or `p-2 md:p-6`. Wait, the form itself is in a wrapper with `p-4 md:p-6`.
4. In `CommentForm.tsx`:
   - The avatar could be slightly smaller on mobile: `w-[28px] h-[28px] md:w-[36px] md:h-[36px]`.
   - The inputs could have smaller padding: `px-3 py-2 md:px-4 md:py-3` instead of `px-4 py-2.5`.
   - Change `gap-2 md:gap-3` to `gap-1.5 md:gap-3` where appropriate to save horizontal space.
   - The `ForumRichText` component might have its own internal padding we should pass down, but we can only affect what we can see.
   - Buttons can be more compact: `px-3 py-1 md:px-4 md:py-1.5`.
   - Decrease `rounded-[32px]` to `rounded-[24px] md:rounded-[32px]` to be less bulky on mobile.
5. Create modifications and use `pnpm eslint` to verify.
6. Submit the updated code to the PR using `submit`.
7. Reply to the PR comment acknowledging the change.
