/** @type {import('tailwindcss').Config} */

const {
  TailwindColorsUZH,
  TailwindAnimations,
  TailwindFonts,
} = require('@uzh-bf/design-system/dist/constants')

const { fontFamily } = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      ...TailwindAnimations,
      colors: {
        ...TailwindColorsUZH,
      },
      fontFamily: {
        ...TailwindFonts,
        sans: ['var(--font-source-sans)', ...fontFamily.sans],
      },
    },
  },
  plugins: [
    require('tailwindcss-radix')({ variantPrefix: 'rdx' }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/forms'),
  ],
  corePlugins: {
    preflight: false,
  },
}
