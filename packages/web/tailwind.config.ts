import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#06181B",
        ink: "#0A262B",
        panel: "#0F3138",
        panel2: "#123A42",
        brass: "#D7A23B",
        brassDeep: "#B07F26",
        canvas: "#F2ECDD",
        foam: "#56D6B6",
        teak: "#A6633C",
        mist: "#8FA9AC",
      },
      fontFamily: {
        display: ['"Fraunces Variable"', "Fraunces", "serif"],
        body: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      borderColor: {
        hair: "rgba(242,236,221,0.10)",
      },
      boxShadow: {
        seal: "0 0 0 1px rgba(215,162,59,0.5), 0 8px 30px rgba(0,0,0,0.35)",
        panel: "0 1px 0 rgba(242,236,221,0.04) inset, 0 20px 50px -30px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        depth:
          "radial-gradient(1200px 600px at 80% -10%, rgba(215,162,59,0.10), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(86,214,182,0.08), transparent 55%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
