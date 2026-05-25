import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f8fafc",
          100: "#eef2f7",
          200: "#dbe3ee",
          300: "#b8c5d8",
          400: "#8da0b9",
          500: "#687d98",
          600: "#53647c",
          700: "#435166",
          800: "#2f3a4a",
          900: "#1c2430",
          950: "#111722"
        },
        sentinel: {
          50: "#eefcf8",
          100: "#d5f7ec",
          200: "#afeedc",
          300: "#79dec7",
          400: "#3fc4aa",
          500: "#22a58f",
          600: "#178573",
          700: "#146a5d",
          800: "#13554c",
          900: "#124740"
        },
        alert: {
          minor: "#f59e0b",
          major: "#dc2626",
          critical: "#991b1b"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 23, 42, 0.08)",
        focus: "0 0 0 4px rgba(34, 165, 143, 0.18)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
