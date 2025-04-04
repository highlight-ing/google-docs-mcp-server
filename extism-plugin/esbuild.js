/**
 * Build configuration for the Google Docs MCP Extism Plugin.
 * This script uses esbuild to bundle the TypeScript code into JavaScript
 * that can be compiled to WebAssembly by the Extism toolchain.
 */
const esbuild = require("esbuild");

// Build the plugin source code
esbuild.build({
  entryPoints: ["src/index.ts"],   // Main entry point for the plugin
  outdir: "dist",                  // Output directory for compiled files
  bundle: true,                    // Bundle all dependencies into a single file
  sourcemap: true,                 // Generate source maps for debugging
  minify: false,                   // Skip minification for better debugging
  format: "cjs",                   // Use CommonJS format for module output
  target: ["es2020"],              // Target ECMAScript 2020 compatibility
  external: ["@extism/js-pdk"],    // Exclude Extism PDK from the bundle
  resolveExtensions: [".ts", ".js"] // File extensions to resolve
}).catch(() => process.exit(1)); 