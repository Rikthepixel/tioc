import { defineConfig } from "tsup";

export default defineConfig({
  dts: true,
  clean: true,
  outDir: "./lib",
  target: "es2020",
  entry: ["src/index.ts", 'src/submod/required.ts'],
  sourcemap: true,
  format: ["esm", "cjs"],
});
