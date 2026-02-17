import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0D1B2A",
        slate: "#1B263B",
        mist: "#E0E1DD",
        signal: "#2A9D8F",
        alert: "#E76F51"
      }
    }
  },
  plugins: []
};

export default config;
