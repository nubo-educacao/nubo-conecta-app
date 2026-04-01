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
      // Design tokens Nubo Conecta — valores serão refinados via Figma na Sprint 01
      colors: {
        nubo: {
          primary: "#5B47E0",      // Roxo principal
          secondary: "#7C6EF5",
          accent: "#FF6B35",       // Laranja CTA
          background: "#F8F7FF",
          surface: "#FFFFFF",
          "text-primary": "#1A1A2E",
          "text-secondary": "#6B7280",
          "nav-inactive": "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      screens: {
        xs: "375px",
      },
      // Safe area para Bottom Nav em iOS
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};

export default config;
