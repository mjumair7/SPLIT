import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101820",
        mist: "#f7f6ef",
        blaze: "#ff6b35",
        lake: "#1c7293",
        moss: "#2f5d50"
      },
      boxShadow: {
        float: "0 14px 45px rgba(16, 24, 32, 0.15)"
      }
    }
  },
  plugins: []
};

export default config;
