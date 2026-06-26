import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0f17",
          soft: "#111827",
          card: "#161e2e",
        },
        line: "#243049",
        accent: {
          DEFAULT: "#3b82f6",
          semi: "#22c55e",
        },
        danger: "#ef4444",
        warn: "#f59e0b",
      },
    },
  },
  plugins: [],
};

export default config;
