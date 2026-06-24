# bkmrk

A high-performance, zero-dependency, and lightweight browser bookmark HTML exporter/parser for Node.js and modern JavaScript environments.

It converts the Netscape Bookmark HTML format (the standard format used by Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge, and Opera for exporting bookmarks) into clean, machine-readable JSON formats. It also provides a CLI with an interactive Terminal User Interface (TUI) for browsing bookmarks and a stringifier/exporter to serialize bookmark trees back to Netscape HTML format.

## Features

- **Zero External Dependencies**: Fast startup, lightweight footprint, and zero maintenance overhead.
- **Dual module support**: Ships with native ES Modules (ESM) and CommonJS (CJS) exports.
- **Robust Stateful Parser**: Employs a fast token scanner that gracefully recovers from malformed tags, missing close tags (`</A>` or `</H3>`), and raw HTML attributes.
- **Multiple Output Formats**: Parse to a hierarchical tree structure (nested folders with children), a flattened list of bookmarks with their relative directory paths, or a flat key-value object (`{ [title]: url }`) for AI context management.
- **Configurable Date Handling**: Customize date properties (`ADD_DATE`, `LAST_MODIFIED`, `LAST_VISIT`) to JavaScript `Date` objects, ISO-8601 strings, raw Unix epoch seconds, or raw strings.
- **Interactive CLI (TUI)**: A feature-rich interactive terminal interface to browse folders, filter/search bookmarks, open links in the system web browser, and export JSON contexts.

---

## Installation

```bash
pnpm add bkmrk
# or
npm install bkmrk
# or
yarn add bkmrk
```

---

## API Usage

### 1. Parse Bookmark HTML

````typescript
import { parse } from "bkmrk";

const htmlContent = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1493012345">Work Folder</H3>
    <DL><p>
        <DT><A HREF="https://github.com" ADD_DATE="1493012346">GitHub</A>
    </DL><p>
</DL><p>
`;

// Parse into a hierarchical tree (default)
const tree = parse(htmlContent);
console.log(JSON.stringify(tree, null, 2));

// Parse into a flat array of bookmarks with parent directory paths
const flatBookmarks = parse(htmlContent, { format: "flat" });
console.log(flatBookmarks);

// Parse into a flat key-value object of { [title]: url } for AI context management
const kvBookmarks = parse(htmlContent, { format: "kv" });
console.log(kvBookmarks);

### 2. Parse Options

The `parse` function accepts an optional `ParseOptions` configuration object:

```typescript
export interface ParseOptions {
  /**
   * Output format:
   * - 'tree': Hierarchical folder tree (default)
   * - 'flat': Flat list of bookmarks with their folder paths
   * - 'kv': Flat key-value object of { [title]: url } for AI context management
   */
  format?: "tree" | "flat" | "kv";

  /**
   * Date normalization mode:
   * - 'date': Convert Unix epoch timestamps to JavaScript Date objects (default)
   * - 'iso': Convert Unix epoch timestamps to ISO 8601 strings
   * - 'unix': Keep raw Unix epoch seconds (number)
   * - 'none': Keep raw string value directly from the file
   */
  normalizeDates?: "date" | "iso" | "unix" | "none";

  /**
   * Whether to include the base64 favicon data in the output.
   * Disabling this is recommended to drastically reduce memory usage and JSON sizes.
   * @default true
   */
  includeIcon?: boolean;
}
````

### 3. Stringify back to Netscape HTML

Convert a bookmark tree back to a valid browser-importable HTML bookmark file:

```typescript
import { stringify } from "bkmrk";

const htmlOutput = stringify(tree, {
  compact: false, // Outputs pretty-printed, indented HTML structure
  title: "My Exported Bookmarks",
});
```

---

## CLI Tool Usage

The package includes a globally executable binary script. Run it via `npx` or install it globally:

```bash
npx bkmrk <input-file.html> [options]
```

### Options

- `-o, --output <file>`: Output the parsed JSON to a specific file (writes to stdout by default).
- `-f, --format <tree|flat|kv>`: Specify output format (default: `'tree'`).
- `-d, --dates <mode>`: Date mode: `'date'`, `'iso'`, `'unix'`, or `'none'` (default: `'iso'` for JSON compatibility).
- `--no-icon`: Exclude large favicon base64 strings from the parsed JSON.
- `-i, --interactive`: Launch the interactive terminal browser interface (TUI).
- `-h, --help`: Display CLI options.

### Silent / Pipe Conversion

```bash
# Convert to a flat list and output to stdout
npx bkmrk bookmarks.html -f flat

# Convert to a flat key-value object of { [title]: url }
npx bkmrk bookmarks.html -f kv
# Save formatted JSON to a file
npx bkmrk bookmarks.html -o parsed.json --no-icon
```

### Interactive TUI Browser

Launch a full-screen interactive explorer in the terminal to browse, search, and open your exported bookmarks:

```bash
npx bkmrk bookmarks.html -i
```

#### TUI Keyboard Controls:

- **`[Up / Down Arrow]`**: Highlight folder or bookmark.
- **`[Enter]`**: Enter the highlighted folder, or open the highlighted bookmark in your default browser.
- **`[Backspace / B]`**: Navigate back up to the parent folder.
- **`[S]`**: Enter search mode (start typing to live-filter the current folder list).
- **`[C]`**: Clear the active search filter.
- **`[E]`**: Export the currently opened folder context to a JSON file.
- **`[?]`**: Toggle help keybindings display.
- **`[Q / Ctrl+C]`**: Quit the browser interface.

---

## License

MIT License.
