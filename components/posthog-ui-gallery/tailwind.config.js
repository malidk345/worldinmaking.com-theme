/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,scss,css}',
  ],
  darkMode: ['class', '[theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'posthog-3000-50': 'var(--color-posthog-3000-50, #f4f4f5)',
        'posthog-3000-100': 'var(--color-posthog-3000-100, #e4e4e7)',
        'posthog-3000-200': 'var(--color-posthog-3000-200, #e4e4e7)',
        'posthog-3000-300': 'var(--color-posthog-3000-300, #d4d4d8)',
        'posthog-3000-400': 'var(--color-posthog-3000-400, #a1a1aa)',
        'posthog-3000-500': 'var(--color-posthog-3000-500, #71717a)',
        'posthog-3000-600': 'var(--color-posthog-3000-600, #52525b)',
        'posthog-3000-700': 'var(--color-posthog-3000-700, #3f3f46)',
        'posthog-3000-800': 'var(--color-posthog-3000-800, #27272a)',
        'posthog-3000-900': 'var(--color-posthog-3000-900, #18181b)',
        'primary-3000-button-bg': 'var(--primary-3000-button-bg, #1d1f27)',
        'primary-3000-button-border': 'var(--primary-3000-button-border, #1d1f27)',
        'primary-3000-button-border-hover': 'var(--primary-3000-button-border-hover, #353744)',
        'primary-3000-frame-bg': 'var(--primary-3000-frame-bg, #000000)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius, 0.375rem)',
        lg: 'var(--radius-lg, 0.625rem)',
      },
    },
  },
  plugins: [],
}
