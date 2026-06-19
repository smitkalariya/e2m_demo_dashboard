import nextJest from "next/jest.js";

// next/jest loads next.config.ts/.env files and wires up the same SWC transform
// Next.js uses internally, plus mocks for CSS Modules, global CSS, images, and
// next/font (see node_modules/next/dist/build/jest/jest.js). The Next 16 docs
// site only documents Vitest now (node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md),
// but the next/jest helper module itself is still shipped and functional in
// this version (verified by reading the compiled source directly), so we keep
// using it instead of hand-rolling an SWC/babel transform ourselves.
//
// next.config.ts (TS config) loads fine here: Next's config loader has a
// dedicated next-config-ts/transpile-config module specifically to transpile
// next.config.ts, so next/jest's `dir` option can resolve it without ts-node.
const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/e2e/"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/app/**"],
};

// createJestConfig is exported this way to ensure next/jest can load the
// Next.js config, which is async.
export default createJestConfig(customJestConfig);
