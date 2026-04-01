/** @type {import('tailwindcss').Config} */
// Tailwind v4 uses @theme in CSS (see src/index.css) for token registration.
// This file documents the Todoist color palette and is kept for reference /
// tooling compatibility. The canonical source of truth for runtime tokens
// is the @theme block in src/index.css.
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        todoist: {
          red:            '#DB4035', // primary action / active state
          orange:         '#FF9933', // secondary / priority indicator
          sidebar:        '#282828', // sidebar background
          'sidebar-hover':'#3D3D3D', // sidebar item hover
          'sidebar-active':'#4D4D4D', // sidebar item active
          bg:             '#FAFAFA', // main content background
          text:           '#202020', // primary text
        },
      },
    },
  },
  plugins: [],
}
