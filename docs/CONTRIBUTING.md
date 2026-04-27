# Contributing to bmad-todo

## Before You Start

Read the [Anti-Feature Contract](ANTI-FEATURES.md). It lists patterns that are **deliberately excluded** from this project. PRs introducing any listed pattern will be rejected.

## Development Setup

1. Install Node.js >= 20 (see `.nvmrc`)
2. Install pnpm: `corepack enable`
3. Install dependencies: `pnpm install`
4. Start dev servers: `pnpm dev`

## Code Standards

- TypeScript strict mode everywhere
- Named exports only (no default exports)
- No `console.log` in production code
- Components: `PascalCase.tsx`
- Modules: `kebab-case.ts`
- Tests: co-located, same name + `.test.ts(x)`

## Scripts

See the root [README.md](../README.md) for available workspace scripts.
