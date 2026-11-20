module.exports = [
  ...require('../../apps/mobile/eslint.config.cjs'),
  {
    settings: {
      react: { version: require('../../apps/mobile/node_modules/react/package.json').version },
    },
  },
  { ignores: ['.build/**', '.swiftpm/**'] },
];
