1. **Restore SEO heading in `HomeWindow`**:
   - I will use `replace_with_git_merge_diff` on `src/components/Home/HomeWindow.tsx`:
```
<<<<<<< SEARCH
                    <h1 className="text-xl font-bold m-0 mb-2 tracking-tight">A desktop for writing</h1>
=======
                    <h1 className="hidden">a world always making</h1>
                    <h2 className="text-xl font-bold m-0 mb-2 tracking-tight">A desktop for writing</h2>
>>>>>>> REPLACE
```
   - This keeps the visual style unchanged while passing the SEO smoke tests.
2. **Verify with tests**
   - Run `pnpm run test:smoke tests/seo.spec.ts` via `run_in_bash_session` to ensure the smoke tests pass.
3. **Complete pre commit steps**
   - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
4. **Submit changes**
   - Use the `submit` tool to push the final code.
