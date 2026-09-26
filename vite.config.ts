import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Builds the family's file: one self-contained HTML artifact with all JS and
// CSS inlined so it opens from file:// with zero network requests.
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  build: {
    // Keep HTML comments (the vault-data markers) intact. The save mechanism
    // splits the file on those markers, so they must survive the build.
    minify: "esbuild",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
