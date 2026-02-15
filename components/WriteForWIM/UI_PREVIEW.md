# Write for WIM - UI Preview

## Form View

```
┌─────────────────────────────────────────────────────────────────┐
│ Write for WIM                                              [_][□][×]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Write for World in Making                                      │
│  ───────────────────────────                                    │
│  Share your insights, experiences, and expertise with our       │
│  community. We're looking for thoughtful, well-researched       │
│  articles on technology, innovation, and the future.            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Submission Guidelines:                                    │ │
│  │ • Articles should be original and not published elsewhere│ │
│  │ • Minimum 100 characters for initial submission          │ │
│  │ • Focus on actionable insights and clear explanations    │ │
│  │ • Include relevant examples and case studies             │ │
│  │ • Proper attribution for any referenced sources          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Author Information                                             │
│  ───────────────────                                           │
│                                                                 │
│  Full Name *                                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ John Doe                                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Email *                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ john@example.com                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│  We'll use this to contact you about your submission           │
│                                                                 │
│  Short Bio                                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Brief description about yourself (optional)               │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│  This will be displayed with your article if published         │
│                                                                 │
│  Article Details                                                │
│  ────────────────                                              │
│                                                                 │
│  Article Title *                                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Your Compelling Article Title                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Content / Outline *                                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Share your article content or a detailed outline.         │ │
│  │ You can submit the full article now or provide an         │ │
│  │ outline for review first. Minimum 100 characters.         │ │
│  │                                                           │ │
│  │                                                           │ │
│  │                                                           │ │
│  │                                                           │ │
│  │                                                           │ │
│  │                                                           │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│  0 characters (minimum 100 required)                            │
│                                                                 │
│  Social Links (Optional)                                        │
│  ────────────────────────                                      │
│                                                                 │
│  Twitter/X Handle                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ @username                                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  LinkedIn Profile                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://linkedin.com/in/username                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  [Submit Article]  [Reset Form]                                 │
│                                                                 │
│  By submitting this form, you agree to our editorial           │
│  guidelines and grant us the right to publish your article     │
│  with proper attribution.                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Success View

```
┌─────────────────────────────────────────────────────────────────┐
│ Write for WIM                                              [_][□][×]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│                                                                 │
│                          ┌─────┐                                │
│                          │  ✓  │                                │
│                          └─────┘                                │
│                                                                 │
│                  Thank you for your submission!                 │
│                                                                 │
│              We've received your article proposal.              │
│            Our editorial team will review it and get            │
│            back to you within 5-7 business days.                │
│                                                                 │
│                                                                 │
│                  [Submit another article]                       │
│                                                                 │
│                                                                 │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Examples

### Email Error
```
Email *
┌───────────────────────────────────────────────────────────┐
│ invalid-email                                             │
└───────────────────────────────────────────────────────────┘
Please enter a valid email    ← Error message in red/yellow
```

### Content Length Error
```
Content / Outline *
┌───────────────────────────────────────────────────────────┐
│ Short content                                             │
└───────────────────────────────────────────────────────────┘
Content must be at least 100 characters    ← Error message
13 characters (minimum 100 required)
```

### Required Field Error
```
Full Name *
┌───────────────────────────────────────────────────────────┐
│                                                           │
└───────────────────────────────────────────────────────────┘
Name is required    ← Error message after field blur
```

## Color Scheme

### Light Mode
- Background: Light accent color
- Text: Dark primary text
- Borders: Subtle border color
- Guidelines box: Light accent with slight transparency
- Success icon: Green (#059669)
- Error text: Red

### Dark Mode
- Background: Dark accent color
- Text: Light primary text
- Borders: Subtle border color (lighter)
- Guidelines box: Dark accent with slight transparency
- Success icon: Light green (#4ade80)
- Error text: Yellow

## Interactive Elements

### Buttons
- **Submit Article**: Primary button (prominent, accent color)
- **Reset Form**: Secondary button (less prominent, neutral)
- **Submit another article**: Secondary button (in success view)

### Form Fields
- Focus state: Ring indicator
- Error state: Red/yellow border
- Valid state: Normal border
- Hover state: Slight color change

## Responsive Behavior

### Desktop (≥768px)
- Max width: 768px (3xl container)
- Padding: 32px (p-8)
- Full form visible with scroll

### Mobile (<768px)
- Full width with margins
- Padding: 24px (p-6)
- Adjusted font sizes
- Stacked layout maintained

## Window Integration

The form opens as a draggable, resizable window:
- Default size: 700px × 500px
- Min size: 350px × 250px
- Position: Cascaded from last window
- Features: Minimize, maximize, close buttons
- Scrollable content when window is smaller than content
