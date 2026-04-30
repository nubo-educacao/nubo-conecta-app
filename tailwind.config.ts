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
          primary:       "#3092bb",   // Novo Azul MEC
          "primary-light": "#60c6f2", 
          "primary-dark":  "#024F86", // Logo / Dark
          "nav-active":  "#3092bb",   // Alinhado com MEC
          "nav-inactive":"#707A7E",   
          "text-head":   "#3A424E",   
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
          cyan:          "#3092bb",
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
