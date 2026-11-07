import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths let the built site run from a domain root or subfolder.
  base: "./",
  plugins: [react()]
});
