// Standalone Jest config so the Jest adapter can run this fixture in isolation
// (speclock's own suite uses Vitest and excludes tests/fixtures/**).
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
};
