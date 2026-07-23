1. Add an `aria-label` to the `buttonElement` when `OSButton` only contains an icon and no `children`.
Wait, `OSButton` in `components/OSButton/index.tsx` already forwards `props` to the `<button>` element.
Wait, let's look at `components/AppWindow/index.tsx`. The `<button>` at line 852 is just a raw `<button>` element. Let's add an `aria-label` to it.

```tsx
<button
    onClick={(e) => {
        e.stopPropagation();
        closeWindow(item);
    }}
    className="size-12 flex items-center justify-center bg-red-500 text-white shadow-xl rounded-full opacity-0 scale-50 group-hover/mission:opacity-100 group-hover/mission:scale-100 hover:bg-red-600 transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
    aria-label="Close window"
>
    <IconX className="size-6" />
</button>
```

In `components/AppWindow/index.tsx`, the `handleMinimize`, `collapseWindow` and `handleClose` buttons (lines 643, 650, 731) are `OSButton`s that only have icons.

Line 643: `<OSButton size="xs" onClick={handleMinimize} aria-label="Minimize window">`
Line 650: `<OSButton size="xs" onClick={...} aria-label={isMaximized ? "Restore window" : "Maximize window"}>`
Line 731: `<OSButton size="md" onClick={handleClose} icon={<IconX />} aria-label="Close window" />`

In `components/RadixUI/Popover.tsx` line 70:
```tsx
<PopoverPrimitive.Close aria-label="Close" asChild>
    <button aria-label="Close">
        <IconX className="size-4" />
    </button>
</PopoverPrimitive.Close>
```

Wait, `components/RadixUI/Toolbar.tsx` generates `OSButton`s from `ToolbarElement`s. Some are icon-only.
```tsx
if (element.type === 'button') {
    return (
        <OSButton
            key={index}
            onClick={() => !element.disabled && element.onClick?.()}
            variant={element.variant || 'default'}
            size={element.size || 'md'}
            icon={element.icon}
            active={element.active}
            className={`${element.className || ''} !px-[5px] ${element.active ? '!bg-accent-2 hover:!bg-accent-2 text-primary' : ''}`}
            disabled={element.disabled}
            aria-label={element.hideLabel ? element.label : undefined}
            title={element.hideLabel ? element.label : undefined}
        >
            {!element.hideLabel && element.label}
        </OSButton>
    )
}
```

Wait, `aria-label` must be passed to `OSButton` and it must propagate to `<button>`. Let's check if `OSButton` passes `...props` to `<button>`. Yes, it does:
```tsx
                {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
```

Wait, `components/OSButton/index.tsx` already passes `props`. So we can just add `aria-label` to those icon-only buttons!

Let's do this for `components/RadixUI/Toolbar.tsx`! It has a major accessibility issue because all toolbar buttons that hide their label (icon-only) lack `aria-label` and `title`. We can easily fix this!

Wait, `Toolbar` has a bunch of icon-only buttons. Adding `aria-label` and `title` to `Toolbar.tsx` fixes accessibility for all instances.
