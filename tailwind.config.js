/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        retro: ['"Press Start 2P"', "monospace"],
      },
      colors: {
        neon: {
          pink: "#ff2a6d",
          cyan: "#05d9e8",
          purple: "#7700ff",
          yellow: "#f9f871",
        },
      },
    },
  },
  plugins: [],
};
