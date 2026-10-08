import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/tools/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Prevents the "named and default exports together" CJS warning.
  // Consumers using require() will access the default export as .default.
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
});
