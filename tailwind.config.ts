import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./constants/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        fill: {
          1: "rgba(255, 255, 255, 0.10)",
        },
        bankGradient: "#4F46E5",
        indigo: {
          500: "#6366F1",
          700: "#4338CA",
          900: "#312E81",
        },
        success: {
          25: "#ECFDF5",
          50: "#D1FAE5",
          100: "#A7F3D0",
          600: "#059669",
          700: "#047857",
          900: "#064E3B",
        },
        pink: {
          25: "#FDF2F8",
          100: "#FCE7F3",
          500: "#EC4899",
          600: "#DB2777",
          700: "#BE185D",
          900: "#831843",
        },
        blue: {
          25: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          900: "#1E3A8A",
        },
        sky: {
          1: "#F8FAFC",
        },
        black: {
          1: "#0F172A",
          2: "#1E293B",
        },
        gray: {
          25: "#F8FAFC",
          50: "#F1F5F9",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          900: "#0F172A",
        },
        red: {
          50: "#FEF2F2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        amber: {
          50: "#FFFBEB",
          500: "#F59E0B",
          700: "#B45309",
        }
      },
      backgroundImage: {
        "bank-gradient": "linear-gradient(90deg, #4338CA 0%, #4F46E5 100%)",
        "gradient-mesh": "url('/icons/gradient-mesh.svg')",
        "bank-green-gradient":
          "linear-gradient(90deg, #059669 0%, #10B981 100%)",
      },
      boxShadow: {
        form: "0px 1px 2px 0px rgba(15, 23, 42, 0.05)",
        chart:
          "0px 2px 4px -1px rgba(15, 23, 42, 0.06), 0px 4px 6px -1px rgba(15, 23, 42, 0.04)",
        card: "0px 1px 3px 0px rgba(15, 23, 42, 0.06), 0px 1px 2px -1px rgba(15, 23, 42, 0.04)",
        profile:
          "0px 10px 15px -3px rgba(15, 23, 42, 0.08), 0px 4px 6px -2px rgba(15, 23, 42, 0.04)",
        creditCard: "0px 10px 25px -5px rgba(15, 23, 42, 0.1), 0px 8px 10px -6px rgba(15, 23, 42, 0.1)",
      },
      fontFamily: {
        inter: "var(--font-inter)",
        "ibm-plex-serif": "var(--font-ibm-plex-serif)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
