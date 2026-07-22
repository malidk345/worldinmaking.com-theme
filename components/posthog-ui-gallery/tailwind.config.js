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
        'posthog-3000-50': 'var(--color-posthog-3000-50, #fbfbfa)',
        'posthog-3000-100': 'var(--color-posthog-3000-100, #f4f4f0)',
        'posthog-3000-200': 'var(--color-posthog-3000-200, #e5e5dd)',
        'posthog-3000-300': 'var(--color-posthog-3000-300, #d6d6c7)',
        'posthog-3000-400': 'var(--color-posthog-3000-400, #b8b8a3)',
        'posthog-3000-500': 'var(--color-posthog-3000-500, #99997f)',
        'posthog-3000-600': 'var(--color-posthog-3000-600, #7a7a61)',
        'posthog-3000-700': 'var(--color-posthog-3000-700, #5c5c45)',
        'posthog-3000-800': 'var(--color-posthog-3000-800, #3d3d2c)',
        'posthog-3000-900': 'var(--color-posthog-3000-900, #1f1f14)',
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
