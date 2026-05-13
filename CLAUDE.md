# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview the production build locally
```

There is no test runner configured yet.

## Stack

React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4, using `@vitejs/plugin-react` (Oxc-based transformer) and `@tailwindcss/vite`. Entry point is `src/main.tsx`; root component is `src/app/index.tsx`.

## Project structure

Follows [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) conventions:

```
src/
├── app/         # Root component, provider wrappers, router
├── assets/      # Static files
├── components/  # Shared components
├── config/      # Global config and env variables
├── features/    # Feature modules (each may contain api/, components/, hooks/, etc.)
├── hooks/       # Shared hooks
├── lib/         # Preconfigured libraries
├── stores/      # Global state
├── testing/     # Test utilities and mocks
├── types/       # Shared TypeScript types
└── utils/       # Shared utility functions
```

Code flows in one direction: `shared → features → app`. Avoid cross-feature imports; compose features at the app level. Import files directly — no barrel files.

## TypeScript strictness

`tsconfig.app.json` enforces `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`. The build runs `tsc -b` before Vite, so type errors break the build.

## ESLint

`eslint.config.js` uses flat config with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. Type-aware rules are **not** enabled yet — if upgrading, add `tseslint.configs.recommendedTypeChecked` and set `parserOptions.project` in the config.
