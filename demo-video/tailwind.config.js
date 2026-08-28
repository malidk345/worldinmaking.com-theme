module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary-bg, #ffffff)",
          text: "var(--primary-text, #111111)",
        },
        secondary: "var(--secondary-text, #666666)",
        accent: "var(--accent-bg, #f5f5f5)",
        border: "var(--border-color, #e5e5e5)",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["SF Mono", "Fira Code", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        window: "0 25px 65px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)",
        floating: "0 20px 45px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.06)",
        card: "0 4px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
