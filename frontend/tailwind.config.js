/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        surface: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          900: "#0a0e1a",
          950: "#05080f",
        },
      },
      typography: (theme) => ({
        invert: {
          css: {
            "--tw-prose-body":         theme("colors.slate.300"),
            "--tw-prose-headings":     theme("colors.white"),
            "--tw-prose-links":        theme("colors.blue.400"),
            "--tw-prose-bold":         theme("colors.white"),
            "--tw-prose-code":         theme("colors.blue.300"),
            "--tw-prose-pre-bg":       theme("colors.slate.800"),
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
