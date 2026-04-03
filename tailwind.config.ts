import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f4f7f4",
          100: "#e6ede6",
          200: "#cedcd0",
          300: "#adc2b0",
          400: "#85a389",
          500: "#638668",
          600: "#4d6b52",
          700: "#3f5642",
          800: "#344538",
          900: "#2b3930",
        },
        blush: {
          50: "#fdf4f4",
          100: "#fce8e8",
          200: "#f9d5d5",
          300: "#f4b4b4",
          400: "#ec8585",
          500: "#e05c5c",
          600: "#cc3f3f",
          700: "#ab3030",
          800: "#8e2b2b",
          900: "#762929",
        },
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
