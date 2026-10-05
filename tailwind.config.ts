import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFCF7', surface: '#FFFFFF', 'surface-2': '#F2F7FB',
        ink: '#0F2436', 'ink-2': '#3D556B', 'ink-3': '#7A8C9B',
        rule: '#DCE6EF', accent: '#145DA0', 'accent-soft': '#9EC6E6',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
