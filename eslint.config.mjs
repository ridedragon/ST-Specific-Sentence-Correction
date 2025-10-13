<<<<<<< HEAD
import { fileURLToPath } from 'node:url';
import path from 'node:path';
=======
>>>>>>> 65f9deffaa2f155930a99ad579f71756a2051565
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';
import importx from 'eslint-plugin-import-x';
import pinia from 'eslint-plugin-pinia';
import vue from 'eslint-plugin-vue';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

<<<<<<< HEAD
const __dirname = path.dirname(fileURLToPath(import.meta.url));

=======
>>>>>>> 65f9deffaa2f155930a99ad579f71756a2051565
/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  importx.flatConfigs.recommended,
  importx.flatConfigs.typescript,
  ...vue.configs['flat/recommended'],
  pinia.configs['recommended-flat'],
  {
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss,
    },
    rules: {
      ...eslintPluginBetterTailwindcss.configs['recommended-warn'].rules,
      ...eslintPluginBetterTailwindcss.configs['recommended-error'].rules,
      'better-tailwindcss/enforce-consistent-line-wrapping': ['off', { printWidth: 120 }],
      'better-tailwindcss/no-unregistered-classes': ['off', { ignore: ['fa-*'] }],
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/global.css',
        tailwindConfig: 'tailwind.config.js',
      },
    },
  },
  {
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
<<<<<<< HEAD
        tsconfigRootDir: __dirname,
=======
>>>>>>> 65f9deffaa2f155930a99ad579f71756a2051565
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'handle-callback-err': 'off',
      'import-x/no-console': 'off',
      'import-x/no-cycle': 'error',
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'warn',
      'no-dupe-class-members': 'off',
      'no-empty-function': 'off',
      'no-floating-decimal': 'error',
      'no-lonely-if': 'error',
      'no-multi-spaces': 'error',
      'no-redeclare': 'off',
      'no-shadow': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-var': 'error',
      'pinia/require-setup-store-properties-export': 'off',
      'prefer-const': 'warn',
      'vue/multi-word-component-names': 'off',
      yoda: 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
<<<<<<< HEAD
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/ban-types': 'off',
    },
  },
=======
>>>>>>> 65f9deffaa2f155930a99ad579f71756a2051565
  eslintConfigPrettier,
  globalIgnores(['dist/**', 'node_modules/**', 'eslint.config.mjs', 'postcss.config.js', 'vite.config.ts']),
];
