module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Agent worktrees under .claude/worktrees/ hold full repo copies; without
  // these, jest scans them — running duplicate test files and hitting
  // haste-map package-name collisions.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/worktrees/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
};
