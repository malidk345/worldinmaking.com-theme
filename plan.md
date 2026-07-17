1. Verify `CommentSection.tsx` matches strict aesthetic guidelines:
   - Ensure the outer wrapper respects the fluid transition constraints.
   - Adjust typography and colors to ensure opacities (e.g., text-black/90, dark:text-white/90).
   - The form container uses high blur glassmorphic overlay, specular highlights, and physical shadow depth.
   - The form elements inside should have strict physical hover/active states utilizing spring-like cubic beziers.

2. Verify `CommentForm.tsx` matches strict aesthetic guidelines:
   - Nested elements like avatar use sub-pixel borders (`border-[0.5px] border-black/10`).
   - Primary `OSButton` usage shouldn't apply duplicate styling that might override the component's internal design, but should pass appropriate classes. The prompt specifies we cannot change the logic or existing structure, only adapt classes.
   - Inputs, buttons, and containers must avoid pure flat grays; use opacity.
   - Ensure `AnimatePresence` and `motion` variables are using the strictly mandated cubic-bezier curves or spring configuration parameters that closely mirror them (like the mass/stiffness configurations).

3. Apply `pre_commit_instructions` and finalize the response.
