import type { Config } from 'tailwindcss';

// In Tailwind v4, theme tokens are defined in CSS via @theme.
// This config only declares content paths for the JIT scanner.
// Dark mode is handled via @custom-variant dark in globals.css.
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
};

export default config;