/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // PostHog exact breakpoints
    screens: {
      '2xs': '425px',
      xs: '482px',
      sm: '640px',
      md: '768px',
      mdlg: '900px',
      lg: '1024px',
      lgxl: '1100px',
      xl: '1280px',
      '2xl': '1440px',
      '3xl': '1920px',
      reasonable: { raw: '(min-height: 640px)' },
    },
    extend: {
      // PostHog exact border radius
      borderRadius: {
        xs: '2px',
        sm: '4px',
        lg: '20px',
      },
      borderWidth: {
        half: '.5px',
        1: '1px',
        3: '3px',
        8: '8px',
        12: '12px',
        16: '16px',
      },
      colors: {
        // Light scale - Clean White
        'light-1': '#FFFFFF',
        'light-2': '#F5F5F5',
        'light-3': '#E5E5E5',
        'light-4': '#D4D4D4',
        'light-5': '#C4C4C4',
        'light-6': '#B5B5B5',
        'light-7': '#A3A3A3',
        'light-8': '#D4D4D4',
        'light-9': '#737373',
        'light-10': '#9A9A9A',
        'light-11': '#404040',
        'light-12': '#171717',

        transparent: 'transparent',
        current: 'currentColor',

        highlight: 'rgba(235,157,42,.2)',
        footer: '#08042f',

        // PostHog brand colors
        black: '#000',
        blue: '#2F80FA',
        'blue-2': '#589DF8',
        'blue-2-dark': '#1E2F46',
        brown: '#3B2B26',
        'burnt-orange': '#DF6133',
        'burnt-orange-dark': '#8E2600',
        orange: '#EB9D2A',
        'orange-dark': '#C77800',
        creamsicle: '#FFD699',
        'creamsicle-dark': '#E38907',
        fuchsia: '#A621C8',
        'fuchsia-dark': '#74108D',
        gray: '#8F8F8C',
        green: '#6AA84F',
        'green-dark': '#4D7533',
        'green-2': '#36C46F',
        gold: '#FFBA53',
        'gold-dark': '#E38907',
        lilac: '#8567FF',
        'light-blue': '#9FC4FF',
        'light-blue-dark': '#1E2F46',
        'light-purple': '#E2D6FF',
        'light-purple-dark': '#78689D',
        'light-yellow': '#FFCE5C',
        'light-yellow-dark': '#C7982B',
        'lime-green': '#96E5B6',
        navy: '#1E2F46',
        'navy-dark': '#0F233D',
        pink: '#E34C6F',
        'pink-dark': '#8C0D3B',
        'pale-blue': '#D2E6FF',
        'pale-blue-dark': '#648DC2',
        purple: '#B62AD9',
        'purple-2': '#40396E',
        'purple-2-dark': '#3C3154',
        red: '#F54E00',
        'red-2': '#F87A4C',
        'red-2-dark': '#C03300',
        salmon: '#F35454',
        seagreen: '#30ABC6',
        'sky-blue': '#2EA2D3',
        tan: '#F5F5F5',
        teal: '#29DBBB',
        'teal-2': '#6BC0B3',
        'teal-2-dark': '#34796F',
        white: '#fff',
        'white-dark': '#111',
        yellow: '#F7A501',

        // Button colors - PostHog exact
        'button-shadow': '#CD8407',
        'button-border': '#B17816',
        'button-shadow-dark': '#99660E',
        'button-secondary-shadow-dark': '#925D05',

        // CSS variable colors
        border: 'rgb(var(--border) / <alpha-value>)',
        
        // Theme colors
        light: '#fff',
        'accent-light': '#e5e7e0',
        dark: '#1e1f23',
        'accent-dark': '#232429',
        'primary-dark': '#FDFDF8',
      },
      textColor: {
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
      },
      fill: {
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      stroke: {
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      backgroundColor: {
        'primary': 'rgb(var(--bg) / <alpha-value>)',
        'accent': 'rgb(var(--accent) / <alpha-value>)',
        'border': 'rgb(var(--border) / <alpha-value>)',
        'button-shadow': '#CD8407',
        'button-shadow-dark': '#99660E',
        'button-secondary-shadow-dark': '#925D05',
      },
      borderColor: {
        'primary': 'rgb(var(--border) / <alpha-value>)',
        'input': 'rgb(var(--input-border) / <alpha-value>)',
        'button': '#B17816',
        'button-dark': '#835C19',
        'button-secondary-dark': '#C78617',
        'input-dark': 'rgb(var(--input-border) / 0.5)',
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'avenir next',
          'avenir',
          'segoe ui',
          'helvetica neue',
          'helvetica',
          'Ubuntu',
          'roboto',
          'noto',
          'arial',
          'sans-serif',
        ],
        button: ['IBM Plex Sans', 'sans-serif'],
        nav: ['IBM Plex Sans', 'sans-serif'],
        code: ['Source Code Pro', 'Menlo', 'Consolas', 'monaco', 'monospace'],
        os: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
        ],
      },
      fontSize: {
        '2xs': '.625rem',
      },
      gridTemplateColumns: {
        16: 'repeat(16, minmax(0, 1fr))',
      },
      gridColumn: {
        'span-13': 'span 13 / span 13',
        'span-16': 'span 16 / span 16',
      },
      minHeight: {
        md: '780px',
      },
      padding: {
        'fluid-video': '56.25%',
        '1/2': '50%',
      },
      maxWidth: {
        '2xs': '16rem',
        'screen-3xl': '1920px',
      },
      // PostHog exact keyframes
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(6deg)' },
          '50%': { transform: 'rotate(-6deg)' },
        },
        grow: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
        'grow-sm': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        flash: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        reveal: {
          '0%': { maxHeight: 0, opacity: 0 },
          '50%': { opacity: 1 },
          '100%': { maxHeight: '1000px', opacity: 1 },
        },
        slideDown: {
          from: { height: '0px' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        slideUp: {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0px' },
        },
        develop: {
          '0%': {
            opacity: '0',
            filter: 'grayscale(100%) brightness(200%)',
          },
          '30%': {
            opacity: '1',
            filter: 'grayscale(100%) brightness(150%)',
          },
          '100%': {
            opacity: '1',
            filter: 'grayscale(0%) brightness(100%)',
          },
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(-2deg) translateX(-5px)' },
          '50%': { transform: 'rotate(2deg) translateX(5px)' },
        },
        hide: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideIn: {
          from: {
            transform: 'translateX(calc(100% + var(--viewport-padding)))',
          },
          to: { transform: 'translateX(0)' },
        },
        swipeOut: {
          from: { transform: 'translateX(var(--radix-toast-swipe-end-x))' },
          to: { transform: 'translateX(calc(100% + var(--viewport-padding)))' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'gradient-rotate': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        slideUpFadeIn: {
          from: {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideUpFadeOut: {
          from: {
            opacity: '1',
            transform: 'translateY(0)',
          },
          to: {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
        },
      },
      // PostHog exact animations
      animation: {
        wiggle: 'wiggle .2s ease-in-out 3',
        grow: 'grow 2s linear infinite',
        'grow-sm': 'grow-sm 3s linear infinite',
        flash: 'flash 1s ease-in-out 2',
        reveal: 'reveal 1s ease-in-out',
        develop: 'develop 1.5s ease-out forwards',
        slideDown: 'slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)',
        slideUp: 'slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)',
        wobble: 'wobble 3s ease-in-out infinite',
        hide: 'hide 100ms ease-in',
        slideIn: 'slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        swipeOut: 'swipeOut 100ms ease-out',
        'spin-slow': 'spin-slow 3s linear infinite',
        'gradient-rotate': 'gradient-rotate 3s ease infinite',
        slideUpFadeIn: 'slideUpFadeIn 200ms ease-out',
        slideUpFadeOut: 'slideUpFadeOut 200ms ease-out',
      },
      boxShadow: {
        'button': '0 2px 0 #CD8407',
        'button-hover': '0 1px 0 #CD8407',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      // PostHog exact container queries
      containers: {
        '2xs': '16rem',
        'xs': '20rem',
        'sm': '24rem',
        'md': '28rem',
        'lg': '32rem',
        'xl': '36rem',
        '2xl': '42rem',
        '3xl': '48rem',
        '4xl': '56rem',
        '5xl': '64rem',
        '6xl': '72rem',
        '7xl': '80rem',
      },
      // PostHog exact scale
      scale: {
        50: '.5',
        55: '.55',
        60: '.6',
        65: '.65',
        70: '.7',
        75: '.75',
        80: '.8',
        85: '.85',
        90: '.9',
        95: '.95',
        '-1': '-1',
        100: '1',
        '-100': '-1',
      },
    },
    // PostHog exact typography plugin config
    typography: (theme) => ({
      DEFAULT: {
        css: {
          '--tw-prose-body': 'rgb(var(--text-secondary))',
          '--tw-prose-headings': 'rgb(var(--text-primary))',
          '--tw-prose-lead': 'rgb(var(--text-secondary))',
          '--tw-prose-links': 'rgb(var(--text-primary))',
          '--tw-prose-bold': 'rgb(var(--text-primary))',
          '--tw-prose-counters': 'rgb(var(--text-muted))',
          '--tw-prose-bullets': 'rgb(var(--text-muted))',
          '--tw-prose-hr': 'rgb(var(--border))',
          '--tw-prose-quotes': 'rgb(var(--text-secondary))',
          '--tw-prose-quote-borders': 'rgb(var(--border))',
          '--tw-prose-captions': 'rgb(var(--text-muted))',
          '--tw-prose-code': 'rgb(var(--text-primary))',
          '--tw-prose-pre-code': 'rgb(var(--text-primary))',
          '--tw-prose-pre-bg': 'rgb(var(--accent))',
          '--tw-prose-th-borders': 'rgb(var(--border))',
          '--tw-prose-td-borders': 'rgb(var(--border))',
          maxWidth: 'none',
          fontSize: '16px',
          lineHeight: '1.7',
          h1: {
            fontSize: '2rem',
            fontWeight: '600',
            letterSpacing: '-0.025em',
            marginTop: '0',
            marginBottom: '0.5rem',
          },
          h2: {
            fontSize: '1.5rem',
            fontWeight: '600',
            letterSpacing: '-0.025em',
            marginTop: '2rem',
            marginBottom: '0.75rem',
          },
          h3: {
            fontSize: '1.25rem',
            fontWeight: '600',
            letterSpacing: '-0.025em',
            marginTop: '1.5rem',
            marginBottom: '0.5rem',
          },
          p: {
            marginTop: '0',
            marginBottom: '1rem',
            lineHeight: '1.7',
          },
          a: {
            fontWeight: '600',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          },
          'a:hover': {
            opacity: '0.7',
          },
          blockquote: {
            fontStyle: 'normal',
            borderLeftWidth: '3px',
            borderLeftColor: 'rgb(var(--border))',
            backgroundColor: 'rgb(var(--accent))',
            padding: '0.5rem 1rem',
            borderRadius: '0 0.5rem 0.5rem 0',
          },
          code: {
            fontWeight: '500',
            backgroundColor: 'rgb(var(--accent))',
            padding: '0.125rem 0.375rem',
            borderRadius: '0.25rem',
            fontSize: '0.875em',
          },
          'code::before': {
            content: '""',
          },
          'code::after': {
            content: '""',
          },
          img: {
            borderRadius: '0.5rem',
            border: '1px solid rgb(var(--border))',
            margin: '0',
          },
          li: {
            marginTop: '0.25rem',
            marginBottom: '0.25rem',
            lineHeight: '1.6',
          },
          strong: {
            fontWeight: '600',
          },
        },
      },
      sm: {
        css: {
          fontSize: '14px',
          lineHeight: '1.65',
          h1: {
            fontSize: '1.5rem',
          },
          h2: {
            fontSize: '1.25rem',
          },
          h3: {
            fontSize: '1.125rem',
          },
        },
      },
      lg: {
        css: {
          fontSize: '18px',
          lineHeight: '1.75',
          h1: {
            fontSize: '2.25rem',
          },
          h2: {
            fontSize: '1.75rem',
          },
          h3: {
            fontSize: '1.375rem',
          },
        },
      },
      // Dark mode prose
      invert: {
        css: {
          '--tw-prose-body': 'rgb(var(--text-secondary))',
          '--tw-prose-headings': 'rgb(var(--text-primary))',
          '--tw-prose-lead': 'rgb(var(--text-secondary))',
          '--tw-prose-links': 'rgb(var(--text-primary))',
          '--tw-prose-bold': 'rgb(var(--text-primary))',
          '--tw-prose-counters': 'rgb(var(--text-muted))',
          '--tw-prose-bullets': 'rgb(var(--text-muted))',
          '--tw-prose-hr': 'rgb(var(--border))',
          '--tw-prose-quotes': 'rgb(var(--text-secondary))',
          '--tw-prose-quote-borders': 'rgb(var(--border))',
          '--tw-prose-captions': 'rgb(var(--text-muted))',
          '--tw-prose-code': 'rgb(var(--text-primary))',
          '--tw-prose-pre-code': 'rgb(var(--text-primary))',
          '--tw-prose-pre-bg': 'rgb(var(--accent))',
          '--tw-prose-th-borders': 'rgb(var(--border))',
          '--tw-prose-td-borders': 'rgb(var(--border))',
        },
      },
    }),
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
    // PostHog exact container-size utility
    function ({ addUtilities }) {
      addUtilities({
        '.container-size': { 'container-type': 'size' },
        '.container-inline-size': { 'container-type': 'inline-size' },
      })
    },
  ],
}
