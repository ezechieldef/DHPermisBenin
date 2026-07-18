const { colors } = require('./src/theme/colors.cjs');

const themeColors = Object.fromEntries(Object.keys(colors).map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: themeColors,
      borderRadius: { '4xl': '32px' },
    },
  },
  plugins: [],
};
