<div align="center">

# <img src="web/public/favicons/favicon-32x32.png" width="28" alt="bkmrk"> bkmrk

**High-performance, zero-dependency browser bookmark parser & CLI for Node.js**

[![npm version](https://img.shields.io/npm/v/bkmrk?style=flat-square&color=blue)](https://www.npmjs.com/package/bkmrk) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/AminZibayi/bkmrk/blob/main/LICENSE) [![typescript](https://img.shields.io/badge/TypeScript-5.4-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![ci](https://img.shields.io/github/actions/workflow/status/AminZibayi/bkmrk/deploy.yml?branch=main&style=flat-square&label=CI)](https://github.com/AminZibayi/bkmrk/actions) [![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/AminZibayi/bkmrk/pulls)

Converts the Netscape Bookmark HTML format — used by Chrome, Firefox, Safari, Edge, and Opera — into clean, machine-readable JSON. Ships with a powerful library and an interactive terminal browser.

[**Playground**](https://aminzibayi.github.io/bkmrk/) · [**Quick Start**](#quick-start) · [**API**](#api) · [**CLI**](#cli)

</div>

---

## Highlights

|                        |                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Zero dependencies**  | No transitive supply chain risk. What you install is what runs.                        |
| **Robust parser**      | Gracefully recovers from malformed HTML, missing close tags, and raw attributes.       |
| **3 output formats**   | Hierarchical tree, flat list with paths, or key-value `{ title: url }` for AI context. |
| **Date normalization** | `Date` objects, ISO-8601 strings, Unix epochs, or raw strings — your choice.           |
| **Interactive TUI**    | Full-screen terminal browser to navigate, search, and export bookmarks.                |

---

## Quick Start

```bash
npm install bkmrk
```

```typescript
import { parse, stringify } from "bkmrk";

const html = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<DL><p>
    <DT><H3 ADD_DATE="1493012345">Work</H3>
    <DL><p>
        <DT><A HREF="https://github.com" ADD_DATE="1493012346">GitHub</A>
    </DL><p>
</DL><p>
`;

const tree = parse(html);
const flat = parse(html, { format: "flat" });
const kv = parse(html, { format: "kv" });

// Round-trip back to Netscape HTML
const output = stringify(tree, { title: "My Bookmarks" });
```

---

## API

### `parse(html, options?)`

Parse a Netscape Bookmark HTML string.

```typescript
import { parse } from "bkmrk";

// Hierarchical tree (default)
const tree = parse(html);

// Flat list with folder paths
const flat = parse(html, { format: "flat" });

// Key-value map for AI context
const kv = parse(html, { format: "kv" });
```

#### Options

```typescript
interface ParseOptions {
  /** Output format: "tree" | "flat" | "kv" — default: "tree" */
  format?: "tree" | "flat" | "kv";

  /** Date mode: "date" | "iso" | "unix" | "none" — default: "date" */
  normalizeDates?: "date" | "iso" | "unix" | "none";

  /** Include base64 favicon data — default: true */
  includeIcon?: boolean;
}
```

### `stringify(tree, options?)`

Serialize a bookmark tree back to valid Netscape HTML.

```typescript
import { stringify } from "bkmrk";

const html = stringify(tree, {
  compact: false,
  title: "My Exported Bookmarks",
});
```

---

## CLI

```bash
npx bkmrk <input.html> [options]
```

### Options

| Flag                  | Description                      | Default |
| --------------------- | -------------------------------- | ------- |
| `-o, --output <file>` | Write output to file             | stdout  |
| `-f, --format <mode>` | `tree`, `flat`, or `kv`          | `tree`  |
| `-d, --dates <mode>`  | `date`, `iso`, `unix`, or `none` | `iso`   |
| `--no-icon`           | Exclude favicon base64 strings   | —       |
| `-i, --interactive`   | Launch interactive TUI browser   | —       |
| `-h, --help`          | Show help                        | —       |

### Examples

```bash
# Convert to flat list → stdout
npx bkmrk bookmarks.html -f flat

# Key-value object for AI context
npx bkmrk bookmarks.html -f kv

# Save to file, no favicons
npx bkmrk bookmarks.html -o out.json --no-icon
```

### Interactive TUI

```bash
npx bkmrk bookmarks.html -i
```

| Key               | Action                                  |
| ----------------- | --------------------------------------- |
| `↑` `↓`           | Navigate folders / bookmarks            |
| `Enter`           | Open bookmark in browser / enter folder |
| `Backspace` / `B` | Go back to parent folder                |
| `S`               | Start search (live filter)              |
| `C`               | Clear search filter                     |
| `E`               | Export current folder to JSON           |
| `?`               | Toggle keybindings help                 |
| `Q` / `Ctrl+C`    | Quit                                    |

---

## Sponsoring

If you use this package in your project, consider supporting development:

[![Sponsor](https://img.shields.io/badge/Sponsor-black?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/AminZibayi)

---

## License

[MIT](LICENSE) © [Amin Zibayi](https://github.com/AminZibayi)
