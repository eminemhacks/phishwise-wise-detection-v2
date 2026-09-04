/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        hand: ["Caveat", "cursive"],
      },
      colors: {
        ink: {
          50: "#f3f6fb",
          100: "#e4eaf4",
          200: "#c5d2e6",
          300: "#97add0",
          400: "#6383b5",
          500: "#41659b",
          600: "#315082",
          700: "#294169",
          800: "#263858",
          900: "#1b2740",
          950: "#101830",
        },
        signal: {
          50: "#effcf9",
          100: "#c8f5ec",
          200: "#92e9da",
          300: "#54d5c4",
          400: "#26bbab",
          500: "#0d9f92",
          600: "#088077",
          700: "#0a6660",
          800: "#0c524e",
          900: "#0e4441",
        },
        amberx: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,48,.06), 0 4px 16px rgba(16,24,48,.06)",
        lift: "0 8px 30px rgba(16,24,48,.14)",
        paper: "0 1px 3px rgba(16,24,48,.08), 0 4px 20px rgba(16,24,48,.06), 0 0 0 1px rgba(16,24,48,.04)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(.7)", opacity: "0" },
          "70%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        pop: "pop .45s cubic-bezier(.2,.9,.3,1.4) both",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
