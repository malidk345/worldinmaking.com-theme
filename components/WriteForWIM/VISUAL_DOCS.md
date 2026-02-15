# Write for WIM Interface - Visual Documentation

## Component Overview

The WriteForWIM component creates a professional submission form for writers who want to contribute articles to World in Making (WIM). The interface opens as a window when users click the "write for wim" button in the post list toolbar.

## UI Structure

### Header Section
- **Title**: "Write for World in Making" (text-3xl, bold)
- **Description**: Brief paragraph explaining the submission process
- **Styling**: Uses `text-primary-text` and `text-primary-text/70` for hierarchy

### Guidelines Box
- **Background**: `bg-accent/30` with `border-border` rounded corners
- **Content**: Bulleted list of submission guidelines
- **Purpose**: Sets expectations for article submissions

### Form Sections

#### 1. Author Information
**Fields:**
- Full Name (required)
- Email (required, validated)
- Short Bio (optional, multi-line)

**Styling:**
- Section header with bottom border
- Column direction for labels above inputs
- Error messages in red/yellow theme colors

#### 2. Article Details  
**Fields:**
- Article Title (required)
- Content/Outline (required, min 100 chars, 12 rows)

**Features:**
- Character counter showing current length vs minimum
- Real-time validation
- Large textarea for content input

#### 3. Social Links (Optional)
**Fields:**
- Twitter/X Handle
- LinkedIn Profile

**Styling:**
- Clearly marked as optional
- Consistent with required fields but no validation

#### 4. Action Buttons
- **Submit Button**: Primary variant, disabled until form is valid
- **Reset Button**: Secondary variant, clears all fields
- Both use `size="lg"` for prominence

### Success State
When form is submitted successfully:
- Centered layout with success icon (green check mark)
- Thank you message
- Information about review timeline (5-7 business days)
- "Submit another article" button to reset

## Theme Integration

### Colors Used
- `text-primary-text` - Main text color
- `text-primary-text/70` - Secondary text (70% opacity)
- `text-primary-text/50` - Muted text (50% opacity)
- `bg-accent` - Accent background
- `bg-accent/30` - Light accent background (30% opacity)
- `border-border` - Border color
- `text-green-600/dark:text-green-400` - Success states

### Components Used
- `OSButton` - Consistent button styling
- `Input` from `OSForm` - Text inputs with built-in validation
- `Textarea` from `OSForm` - Multi-line text areas
- `IconCheck` from `@posthog/icons` - Success icon

## Responsive Design
- `max-w-3xl` container for optimal reading width
- Responsive padding: `p-6 md:p-8`
- Scrollable container: `overflow-auto` on parent
- Full height: `h-full` to fill window

## Validation Features

### Real-time Validation
- Email format validation
- Required field checking
- Minimum character count (100 for content)
- Visual error messages on blur

### Error States
- Red/yellow text for errors (theme-dependent)
- Error messages appear below fields
- Submit button disabled until all validations pass

## Accessibility
- Proper label associations
- Required field indicators (*)
- Placeholder text for guidance
- Descriptive helper text
- Clear error messages

## User Experience Flow

1. **Initial Load**: Empty form with guidelines visible
2. **Filling Form**: Real-time validation, errors show on blur
3. **Submit**: Button disabled until form is valid
4. **Submitting**: Button shows "Submitting..." state
5. **Success**: Shows success message for 4 seconds
6. **Auto-reset**: Form clears and returns to initial state
7. **Manual Reset**: Reset button available at any time

## Integration Points

### Posts Toolbar
- Button appears in post list toolbar
- Uses `IconNewspaper` icon
- Opens in window system with `/write` path
- Window title: "Write for WIM"

### Window System
- Opens as draggable/resizable window
- Inherits theme from site settings
- Fits within desktop constraints
- Can be minimized, maximized, closed like other windows

## Future Enhancements (TODO)

- [ ] Connect to actual backend API for submissions
- [ ] Add file upload for article images
- [ ] Implement draft saving
- [ ] Add rich text editor for content
- [ ] Email confirmation after submission
- [ ] Preview article before submission
- [ ] Tag/category selection
- [ ] Estimated reading time calculator
