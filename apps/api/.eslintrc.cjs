module.exports = {
  extends: ['@playall/config/eslint.base.cjs'],
  parserOptions: {
    project: ['./tsconfig.json']
  },
  env: {
    node: true,
    jest: true
  }
};
