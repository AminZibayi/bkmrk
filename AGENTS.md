# AGENTS Guidelines for This Repository

This repository contains `bookmark-parser`, a zero-dependency, high-performance TypeScript package for parsing and stringifying Netscape HTML bookmarks. Please follow these guidelines so that the package and its interactive terminal browser (TUI) remain clean, fast, and robust.

---

## 1. Tech Stack & Environment

- **Runtime**: Node.js (ESM by default, `"type": "module"`).
- **Dependencies**: Runtime dependencies must remain zero for the parser/writer. `blessed` is allowed exclusively as a runtime dependency for the CLI TUI.
- **Build System**: Compiles dual ESM (`.js` files) and CommonJS (`.cjs` files) formats via a custom `build.js` pipeline. Always run `pnpm build` to compile assets.
- **Package Manager**: Mandatory use of `pnpm`.

---

## 2. Coding Conventions & Strict Rules

- **Quotes & Formatting**: Use double quotes, semicolons, and ES5 trailing commas (enforced by Prettier and ESLint). ESLint allows single quotes only to avoid escaping inner double quotes.
- **No `any` Types**: Never use `: any` or `as any`. Use proper TypeScript types or `unknown` with narrowing.
- **No `new Promise`**: Use `Promise.withResolvers()` instead of `new Promise((resolve, reject) => ...)` if you need custom promises.
- **Bare Catch Blocks**: Always use a bare `catch {}` block (no binding variable like `catch (err)`) when the caught error is unused.
- **ESM Compatibility**: Relative imports in source files and tests must always include the `.js` file extension (e.g. `import { parse } from "./parser.js"`).

---

## 3. Useful Commands

| Command              | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `pnpm build`         | Compile ESM/CJS assets, map requires, and inject shebangs.               |
| `pnpm test`          | Run Vitest unit tests.                                                   |
| `pnpm test:cov`      | Run Vitest unit tests with coverage metrics collection.                  |
| `pnpm lint`          | Run ESLint flat configuration style and rule checks.                     |
| `pnpm format`        | Run Prettier formatter to auto-fix code styles.                          |
| `pnpm validate`      | Full pipeline verification: typecheck, lint, formatting, and unit tests. |
| `pnpm cli -i <file>` | Launch the interactive terminal browser TUI.                             |

---

Following these rules keeps the codebase lightweight, highly portable, and type-safe. Before submitting any changes, verify them by running `pnpm validate`.
