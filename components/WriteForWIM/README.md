# WriteForWIM Component

A form component for writers to submit article proposals to World in Making.

## Features

- **Author Information**: Collects name, email, and optional bio
- **Article Details**: Title and content/outline (minimum 100 characters)
- **Social Links**: Optional Twitter and LinkedIn profiles
- **Form Validation**: Real-time validation with error messages
- **Success State**: Confirmation message after submission
- **Consistent Styling**: Uses OS-styled form components to match site theme

## Usage

The component is automatically opened when users click the "write for wim" button in the post list toolbar.

```tsx
import WriteForWIM from 'components/WriteForWIM'

<WriteForWIM />
```

## Props

- `className?: string` - Optional additional CSS classes

## Form Fields

### Required Fields
- **Full Name**: Author's full name
- **Email**: Valid email address for contact
- **Article Title**: Title of the proposed article
- **Content/Outline**: Article content or outline (min. 100 characters)

### Optional Fields
- **Short Bio**: Brief author description (displayed with published articles)
- **Twitter/X Handle**: Social media link
- **LinkedIn Profile**: Professional network link

## Validation

- Email must be in valid format
- Content must be at least 100 characters
- Form cannot be submitted until all required fields are valid
- Fields show error messages on blur if invalid

## Submission

Currently simulates a submission with a 1.5-second delay. The form shows a success message for 4 seconds after submission, then resets automatically.

## Styling

The component uses:
- `OSButton` for consistent button styling
- `Input` and `Textarea` from `OSForm` for form fields
- Tailwind utility classes for layout and theming
- Theme-aware colors (`text-primary-text`, `bg-accent`, etc.)
- Responsive design with container-based layout
