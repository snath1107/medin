import { FlatCompat } from "@eslint/eslintrc";

// Next.js's recommended rules (React, hooks, accessibility basics, TypeScript).
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/", "node_modules/", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
