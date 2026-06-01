import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Setting base to "./" ensures assets load correctly regardless of deployment path
  base: "./", 
  server: {
    port: 5173,
  },
});