// next/jest pre-configures Jest for Next.js:
// — transpiles TypeScript via SWC (fast, no Babel needed)
// — resolves @/* path aliases from tsconfig.json automatically
// — mocks CSS and image imports so they don't throw errors in tests
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
});
