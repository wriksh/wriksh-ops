// Empty shim for `server-only` — required because the real package throws
// when imported from a non-Next.js context (CLI scripts). The Next.js
// bundler resolves `server-only` to this file via the alias in
// scripts/tsconfig.json + tsx's --tsconfig flag, so the import is a no-op
// at the CLI level but still emits the "this should be server-only"
// runtime guard inside the Next.js bundle.
export {};
