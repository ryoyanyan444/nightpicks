import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary brand colors - 夜のイメージ
        night: {
          50: "#f0f0ff",
          100: "#e0e0ff",
          200: "#c4b5fd",
          300: "#a78bfa",
          400: "#8b5cf6",
          500: "#7c3aed", // メインアクセント
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#2e1065",
          950: "#1a0a3e",
        },
        // ゴールド系 - ホスト/キャバの高級感
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // ダーク系背景
        dark: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          850: "#172033",
          900: "#111827",
          950: "#0a0e1a",
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans JP"',
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          "Meiryo",
          "sans-serif",
        ],
        display: [
          '"Inter"',
          '"Noto Sans JP"',
          "sans-serif",
        ],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "#d1d5db",
            a: {
              color: "#a78bfa",
              "&:hover": {
                color: "#c4b5fd",
              },
            },
            h1: { color: "#f9fafb" },
            h2: { color: "#f3f4f6" },
            h3: { color: "#e5e7eb" },
            h4: { color: "#e5e7eb" },
            strong: { color: "#f9fafb" },
            code: { color: "#a78bfa" },
            blockquote: {
              color: "#9ca3af",
              borderLeftColor: "#7c3aed",
            },
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
