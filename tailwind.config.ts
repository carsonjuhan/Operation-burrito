import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-dm-serif-display)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
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
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
        "fade-in": "fadeIn 0.3s ease-out both",
        "slide-up": "slideUp 0.35s ease-out both",
        "scale-in": "scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
