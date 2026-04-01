import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Design tokens — extraídos do Figma (node 32:6814) em 2026-04-01
      colors: {
        nubo: {
          primary:       "#38B1E4",   // Primary Main
          "primary-light": "#6CD4FF", // Primary Light
          "primary-dark":  "#024F86", // Background Dark / logo color
          "nav-active":  "#048FAD",   // BottomNav ativo
          "nav-inactive":"#707A7E",   // BottomNav inativo
          "text-head":   "#3A424E",   // Heading Text
          "text-body":   "rgba(58,66,78,0.9)",
          "text-secondary":"rgba(58,66,78,0.5)",
          background:    "#FFFFFF",
          "line":        "#DADADA",
          "border":      "#E6E6E6",
          success:       "#12B937",
          warning:       "#FFB800",
          danger:        "#FF445D",
          yellow:        "#FFCC00",
          orange:        "#FF9900",
          brick:         "#F65834",
          purple:        "#9747FF",
          cyan:          "#00B5DD",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
      },
      screens: { xs: "375px" },
      spacing: { "safe-bottom": "env(safe-area-inset-bottom)" },
    },
  },
  plugins: [],
};

export default config;
