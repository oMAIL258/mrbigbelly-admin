import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F1E7', surface: '#FFFFFF', 'surface-2': '#FBF4E6',
        ink: '#1E1A17', 'ink-2': '#4A423C', 'ink-3': '#8A7F75',
        rule: '#E8DDC9', accent: '#C0532F', 'accent-soft': '#E8B48A',
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
