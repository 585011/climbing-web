import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['Route'] },
      ],
    },
    plugins: { 'react-refresh': reactRefresh },
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // TanStack file routes export `Route` next to a local page component by
    // convention, so this rule can only produce noise here.
    files: ['src/app/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
