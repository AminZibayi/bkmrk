import * as fs from "fs";
import { exec } from "child_process";
import blessed from "blessed";
import { parse } from "./parser.js";
import { Folder, Bookmark } from "./types.js";

function printHelp(): void {
  console.log(`
Usage: bookmark-parser <input-file> [options]

Options:
-o, --output <file>    Output file path (default: stdout)
-f, --format <format>  Output format: 'tree', 'flat', or 'kv' (default: 'tree')
-d, --dates <mode>     Date mode: 'date', 'iso', 'unix', 'none' (default: 'iso')
  --no-icon              Omit favicon icon base64 strings
  -i, --interactive      Launch the interactive Terminal User Interface (TUI)
  -h, --help             Show help documentation
`);
}

function openUrl(url: string): void {
  try {
    const platform = process.platform;
    const escapedUrl = url.replace(/"/g, '\\"');
    if (platform === "win32") {
      exec(`start "" "${escapedUrl}"`);
    } else {
      const cmd = platform === "darwin" ? "open" : "xdg-open";
      exec(`${cmd} "${escapedUrl}"`);
    }
  } catch {
    // Fail silently when system browser cannot be spawned
  }
}

// ─── Interactive TUI using blessed ────────────────────────────────────────────────

function startTui(rootFolder: Folder): void {
  const screen = blessed.screen({ smartCSR: false, title: "Bookmark Parser Browser" });

  // State
  let currentFolder = rootFolder;
  const folderStack: Folder[] = [];
  let searchQuery = "";
  let isSearching = false;
  let statusMessage = "Press ? for help | / to search | q to quit";

  // ─── Layout widgets ───────────────────────────────────────────────────────────

  const headerBox = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    content: "",
    style: { fg: "white", bg: "blue", bold: true },
  });

  const pathBox = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    width: "100%",
    height: 1,
    content: "",
    style: { fg: "yellow" },
  });

  const searchBox = blessed.box({
    parent: screen,
    top: 4,
    left: 0,
    width: "100%",
    height: 1,
    content: "",
    style: { fg: "magenta" },
  });

  const list = blessed.list({
    parent: screen,
    top: 5,
    left: 0,
    width: "100%",
    bottom: 2,
    mouse: true,
    keys: true,
    vi: true,
    interactive: true,
    style: {
      selected: { fg: "black", bg: "cyan", bold: true },
      item: { fg: "white" },
    },
  });

  const statusBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 2,
    content: "",
    style: { fg: "white" },
  });

  // ─── Rendering helpers ────────────────────────────────────────────────────────

  type DisplayItem = Bookmark | Folder | { type: "back"; title: string };

  function getVisibleItems(): DisplayItem[] {
    const items: DisplayItem[] = [];
    if (folderStack.length > 0) {
      items.push({ type: "back", title: ".. (Go Back)" });
    }
    const query = searchQuery.toLowerCase();
    for (const child of currentFolder.children) {
      if (!query) {
        items.push(child);
      } else {
        const titleMatch = child.title.toLowerCase().includes(query);
        const urlMatch = child.type === "bookmark" && child.url.toLowerCase().includes(query);
        if (titleMatch || urlMatch) {
          items.push(child);
        }
      }
    }
    return items;
  }

  function renderItem(item: DisplayItem): string {
    const cFolder = "\x1b[34;1m";
    const cBookmark = "\x1b[32m";
    const cMuted = "\x1b[90m";
    const cBold = "\x1b[1m";
    const cReset = "\x1b[0m";

    if ("type" in item && item.type === "back") {
      return `${cMuted}<-  ${item.title}${cReset}`;
    }
    if (item.type === "folder") {
      const f = item as Folder;
      return `${cFolder}[+] ${cReset}${cBold}${f.title}${cReset} ${cMuted}(${f.children.length} items)${cReset}`;
    }
    const b = item as Bookmark;
    const maxTitle = 80;
    const maxUrl = 60;
    const title = b.title.length > maxTitle ? b.title.substring(0, maxTitle - 3) + "..." : b.title;
    const url = b.url.length > maxUrl ? b.url.substring(0, maxUrl - 3) + "..." : b.url;
    return `${cBookmark} ─  ${cReset}${title} ${cMuted}- ${url}${cReset}`;
  }

  function render(): void {
    // Header
    const titleText = " BOOKMARK PARSER BROWSER ";
    const pad = Math.max(0, Math.floor((screen.cols - titleText.length) / 2));
    headerBox.content = " ".repeat(pad) + titleText;

    // Path
    const segments = ["Root", ...folderStack.map((f) => f.title)];
    if (currentFolder.title && currentFolder.title !== "Bookmarks") {
      segments.push(currentFolder.title);
    }
    pathBox.content = `\x1b[33mPath:\x1b[0m ${segments.join(" > ")}`;

    // Search
    if (isSearching) {
      searchBox.content = `\x1b[35mSearch:\x1b[0m ${searchQuery}_`;
    } else if (searchQuery) {
      searchBox.content = `\x1b[35mFilter:\x1b[0m ${searchQuery} \x1b[90m(/ to change, Esc to clear)\x1b[0m`;
    } else {
      searchBox.content = "";
    }

    // Status bar
    const helpLine =
      "\x1b[90m[↑↓] Nav  [Enter] Open  [Backspace] Back  [/] Search  [e] Export  [?] Help  [q] Quit\x1b[0m";
    const msgLine = statusMessage ? `\x1b[33m${statusMessage}\x1b[0m` : "";
    statusBar.content = msgLine + "\n" + helpLine;
    screen.render();
  }

  function updateList(selectIndex: number = 0) {
    const items = getVisibleItems();
    list.setItems(items.map(renderItem));
    list.select(selectIndex);
    screen.render();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  function enterFolder(folder: Folder): void {
    folderStack.push(currentFolder);
    currentFolder = folder;
    statusMessage = "Entered: " + folder.title;
    updateList(0);
    render();
  }

  function goBack(): void {
    if (folderStack.length === 0) return;
    const parent = folderStack.pop()!;
    currentFolder = parent;
    statusMessage = "Back to: " + parent.title;
    updateList(0);
    render();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function openBookmark(bookmark: Bookmark): void {
    openUrl(bookmark.url);
    statusMessage = "Opened: " + bookmark.title;
    render();
  }

  function exportCurrentFolder(): void {
    const outName = `export-${Date.now()}.json`;
    try {
      fs.writeFileSync(outName, JSON.stringify(currentFolder, null, 2));
      statusMessage = "Exported to " + outName;
    } catch {
      statusMessage = "Export failed";
    }
    render();
  }

  // ─── Key & Event bindings ──────────────────────────────────────────────────────

  screen.on("keypress", (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => {
    if (!key) return;

    if (key.ctrl && key.name === "c") {
      process.exit(0);
    }

    if (isSearching) {
      if (key.name === "escape") {
        isSearching = false;
        searchQuery = "";
        statusMessage = "Search cancelled";
        updateList(0);
        render();
        list.focus();
      } else if (key.name === "enter" || key.name === "return") {
        isSearching = false;
        statusMessage = `Filter locked: "${searchQuery}"`;
        list.focus();
        render();
      } else if (key.name === "backspace" || ch === "\x7f" || ch === "\b") {
        if (searchQuery.length > 0) {
          searchQuery = searchQuery.slice(0, -1);
          updateList(0);
          render();
        }
      } else if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
        searchQuery += ch;
        updateList(0);
        render();
      }
      return;
    }

    // Normal command mode
    if (key.name === "q") {
      process.exit(0);
    } else if (key.name === "backspace" || key.name === "b") {
      goBack();
    } else if (key.name === "s" || ch === "/") {
      isSearching = true;
      searchQuery = "";
      statusMessage = "Type to search. Enter to apply. Esc to cancel.";
      updateList(0);
      render();
    } else if (key.name === "e") {
      exportCurrentFolder();
    } else if (ch === "?") {
      statusMessage = statusMessage.includes("[↑↓]")
        ? "Press ? for help | / to search | q to quit"
        : "\x1b[90m[↑↓] Nav  [Enter] Open  [Backspace] Back  [/] Search  [e] Export  [?] Help  [q] Quit\x1b[0m";
    }
  });

  list.on("select", (_item: blessed.Widgets.BoxElement, index: number) => {
    if (isSearching) return;
    const items = getVisibleItems();
    if (index >= items.length || index < 0) return;

    const item = items[index];
    if ("type" in item && item.type === "back") {
      goBack();
    } else if (item.type === "folder") {
      enterFolder(item as Folder);
    } else if (item.type === "bookmark") {
      openBookmark(item as Bookmark);
    }
  });

  list.focus();
  updateList(0);
  render();
}

// ─── CLI Runner ──────────────────────────────────────────────────────────────

function runCli(): void {
  const args = process.argv.slice(2);
  const parsed = {
    inputFile: "",
    outputFile: "",
    format: "tree" as "tree" | "flat" | "kv",
    dates: "iso" as "date" | "iso" | "unix" | "none",
    includeIcon: true,
    interactive: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      parsed.help = true;
    } else if (arg === "-i" || arg === "--interactive") {
      parsed.interactive = true;
    } else if (arg === "--no-icon") {
      parsed.includeIcon = false;
    } else if (arg === "-o" || arg === "--output") {
      parsed.outputFile = args[++i] || "";
    } else if (arg === "-f" || arg === "--format") {
      const val = args[++i];
      if (val === "flat" || val === "tree" || val === "kv") parsed.format = val;
    } else if (arg === "-d" || arg === "--dates") {
      const val = args[++i];
      if (val === "date" || val === "iso" || val === "unix" || val === "none") parsed.dates = val;
    } else if (!arg.startsWith("-")) {
      parsed.inputFile = arg;
    }
  }

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  if (!parsed.inputFile) {
    console.error("Error: Input file path is required.");
    printHelp();
    process.exit(1);
  }

  if (!fs.existsSync(parsed.inputFile)) {
    console.error(`Error: File does not exist: ${parsed.inputFile}`);
    process.exit(1);
  }

  let htmlContent = "";
  try {
    htmlContent = fs.readFileSync(parsed.inputFile, "utf8");
  } catch {
    console.error(`Error: Failed to read file: ${parsed.inputFile}`);
    process.exit(1);
  }

  if (parsed.interactive) {
    const tree = parse(htmlContent, {
      normalizeDates: parsed.dates,
      includeIcon: parsed.includeIcon,
    });
    startTui(tree);
    return;
  }

  const result = parse(htmlContent, {
    format: parsed.format,
    normalizeDates: parsed.dates,
    includeIcon: parsed.includeIcon,
  });

  const outputStr = JSON.stringify(result, null, 2);

  if (parsed.outputFile) {
    try {
      fs.writeFileSync(parsed.outputFile, outputStr);
      console.log(`Successfully wrote parsed bookmarks JSON to: ${parsed.outputFile}`);
    } catch {
      console.error(`Error: Failed to write to output file: ${parsed.outputFile}`);
      process.exit(1);
    }
  } else {
    console.log(outputStr);
  }
}

runCli();
