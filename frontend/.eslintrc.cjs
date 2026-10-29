module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // These two rules fire on almost every file in this codebase (no PropTypes
    // declarations, unused React imports); turning them into guidance keeps
    // lint able to surface real errors.
    'react/prop-types': 'off',
    'no-unused-vars': 'warn',
    // Apostrophes/quotes in copy ("Don't have an account?") are intentional;
    // escaping them would only churn the JSX text.
    'react/no-unescaped-entities': 'off',
  },
}
