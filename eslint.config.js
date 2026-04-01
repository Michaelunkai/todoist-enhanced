import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    files: ['server.js', 'routes/**/*.js', 'middleware/**/*.js', 'utils/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
]
