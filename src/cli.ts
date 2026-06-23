import * as fs from "fs";
import * as readline from "readline";
import { exec } from "child_process";
import { parse } from "./parser.js";
import { Folder, Bookmark } from "./types.js";

interface TuiState {
  rootFolder: Folder;
  currentFolder: Folder;
  folderStack: Folder[];
  selectedIndex: number;
  scrollOffset: number;
  searchQuery: string;
  isSearching: boolean;
  message: string;
  showHelp: boolean;
}

function printHelp() {
  console.log(`
Usage: bookmark-parser <input-file> [options]

Options:
  -o, --output <file>    Output file path (default: stdout)
  -f, --format <format>  Output format: 'tree' or 'flat' (default: 'tree')
  -d, --dates <mode>     Date mode: 'date', 'iso', 'unix', 'none' (default: 'iso')
  --no-icon              Omit favicon icon base64 strings
  -i, --interactive      Launch the interactive Terminal User Interface (TUI)
  -h, --help             Show help documentation
`);
}

function openUrl(url: string) {
  try {
    const cmd =
      process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
    exec(`${cmd} "${url.replace(/"/g, '\\"')}"`);
  } catch {
    // Fail silently when system browser cannot be spawned
  }
}

function startTui(rootFolder: Folder) {
  const state: TuiState = {
    rootFolder,
    currentFolder: rootFolder,
    folderStack: [],
    selectedIndex: 0,
    scrollOffset: 0,
    searchQuery: "",
    isSearching: false,
    message: "Use Arrow keys to navigate, press ? for help.",
    showHelp: false,
  };

  // Enable raw keyboard input
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  // Hide terminal cursor
  process.stdout.write("\x1b[?1049h\x1b[?25l");

  function getDisplayedItems(): (Bookmark | Folder | { type: "back"; title: string })[] {
    const items: (Bookmark | Folder | { type: "back"; title: string })[] = [];

    // Prepend Back option if not in root
    if (state.folderStack.length > 0) {
      items.push({ type: "back", title: ".. (Go Back)" });
    }

    const query = state.searchQuery.toLowerCase();
    for (const child of state.currentFolder.children) {
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

  function render() {
    // Clear screen and move cursor to top-left
    process.stdout.write("\x1b[H\x1b[J");

    const width = process.stdout.columns || 80;
    const separator = "─".repeat(width);

    // Header
    console.log("\x1b[1m\x1b[36m┌" + "─".repeat(width - 2) + "┐");
    const titleText = " BOOKMARK PARSER INTERACTIVE BROWSER ";
    const padding = " ".repeat(Math.max(0, Math.floor((width - 2 - titleText.length) / 2)));
    console.log(
      "│" + padding + titleText + padding + (titleText.length % 2 === 0 ? " " : "") + "│\x1b[0m"
    );
    console.log("\x1b[1m\x1b[36m└" + "─".repeat(width - 2) + "┘\x1b[0m");

    // Path
    const folderPath = ["Root", ...state.folderStack.map((f) => f.title)].join(" / ");
    console.log(`\x1b[33mFolder:\x1b[0m ${folderPath}`);
    if (state.isSearching) {
      console.log(
        `\x1b[35m🔍 Search Mode (Type query, Enter to lock, Esc to exit):\x1b[0m ${state.searchQuery}`
      );
    } else if (state.searchQuery) {
      console.log(`\x1b[32mActive Filter:\x1b[0m ${state.searchQuery}`);
    }
    console.log(separator);

    if (state.showHelp) {
      console.log("\x1b[1mHelp Documentation:\x1b[0m");
      console.log("  [Up/Down Arrow]  Navigate items");
      console.log("  [Enter]          Open bookmark in browser or enter folder");
      console.log("  [Backspace / b]  Go back to parent folder");
      console.log("  [s]              Enter search mode / filter current folder");
      console.log("  [c]              Clear search query");
      console.log("  [e]              Export current folder tree as JSON");
      console.log("  [?]              Toggle help documentation");
      console.log("  [q / Ctrl+C]     Quit application");
      console.log(separator);
    }

    const items = getDisplayedItems();
    if (items.length === 0) {
      console.log("  (No items found)");
    } else {
      // Clamp selected index to bounds
      if (state.selectedIndex >= items.length) {
        state.selectedIndex = Math.max(0, items.length - 1);
      }

      const rows = process.stdout.rows || 24;
      const staticLines = state.showHelp ? 18 : 10;
      const maxVisibleItems = Math.max(3, rows - staticLines);

      // Keep scroll offset inside bounds relative to selectedIndex
      if (state.scrollOffset > state.selectedIndex) {
        state.scrollOffset = state.selectedIndex;
      }
      if (state.scrollOffset + maxVisibleItems <= state.selectedIndex) {
        state.scrollOffset = state.selectedIndex - maxVisibleItems + 1;
      }
      state.scrollOffset = Math.max(
        0,
        Math.min(state.scrollOffset, items.length - maxVisibleItems)
      );

      const start = state.scrollOffset;
      const end = Math.min(items.length, start + maxVisibleItems);

      if (start > 0) {
        console.log("  ▲ -- (more items above) --");
      }

      for (let i = start; i < end; i++) {
        const item = items[i];
        const isSelected = i === state.selectedIndex;

        let line = "";
        if ("type" in item && item.type === "back") {
          line = `  ↩  ${item.title}`;
        } else if (item.type === "folder") {
          line = `  📁 [${item.title}] (${item.children.length} items)`;
        } else {
          // Truncate title to fit terminal width and prevent wrapping
          const maxTextLength = Math.max(20, width - 15);
          let displayTitle = item.title;
          if (displayTitle.length > maxTextLength) {
            displayTitle = displayTitle.substring(0, maxTextLength - 3) + "...";
          }
          line = `  🔗 ${displayTitle} \x1b[90m- ${item.url}\x1b[0m`;
        }

        // Hard truncate line if it exceeds screen width
        if (line.length > width && !line.includes("\x1b[")) {
          line = line.substring(0, width - 3) + "...";
        }

        if (isSelected) {
          // Highlight selected line
          console.log(`\x1b[46m\x1b[30m> ${line.substring(2)}\x1b[0m`);
        } else {
          console.log(line);
        }
      }

      if (end < items.length) {
        console.log(`  ▼ -- (and ${items.length - end} more items below) --`);
      }
    }

    console.log(separator);
    if (state.message) {
      console.log(`\x1b[1m\x1b[33mMessage:\x1b[0m ${state.message}`);
    }
  }

  function handleKeyPress(
    ch: string | undefined,
    key: { name?: string; ctrl?: boolean; shift?: boolean }
  ) {
    if (state.isSearching) {
      if (key.name === "return" || key.name === "enter") {
        state.isSearching = false;
        state.message = `Applied filter: "${state.searchQuery}"`;
        render();
      } else if (key.name === "escape") {
        state.isSearching = false;
        state.searchQuery = "";
        state.message = "Search cancelled.";
        render();
      } else if (key.name === "backspace") {
        state.searchQuery = state.searchQuery.slice(0, -1);
        state.selectedIndex = 0;
        state.scrollOffset = 0;
        render();
      } else if (ch && !key.ctrl && key.name !== "tab") {
        state.searchQuery += ch;
        state.selectedIndex = 0;
        state.scrollOffset = 0;
        render();
      }
      return;
    }

    // Normal command mode
    switch (key.name) {
      case "up":
        state.selectedIndex = Math.max(0, state.selectedIndex - 1);
        state.message = "";
        render();
        break;

      case "down": {
        const itemsCount = getDisplayedItems().length;
        state.selectedIndex = Math.min(itemsCount - 1, state.selectedIndex + 1);
        state.message = "";
        render();
        break;
      }

      case "return":
      case "enter": {
        const items = getDisplayedItems();
        const selected = items[state.selectedIndex];
        if (!selected) break;

        if ("type" in selected && selected.type === "back") {
          // Go up
          const parent = state.folderStack.pop();
          if (parent) {
            state.currentFolder =
              state.folderStack[state.folderStack.length - 1] || state.rootFolder;
            state.selectedIndex = 0;
            state.scrollOffset = 0;
            state.message = `Navigated up from ${parent.title}`;
          }
        } else if (selected.type === "folder") {
          // Enter folder
          state.folderStack.push(selected);
          state.currentFolder = selected;
          state.selectedIndex = 0;
          state.scrollOffset = 0;
          state.message = `Entered folder: ${selected.title}`;
        } else if (selected.type === "bookmark") {
          // Open URL
          openUrl(selected.url);
          state.message = `Opening in browser: ${selected.title}`;
        }
        render();
        break;
      }

      case "backspace":
      case "b":
        if (state.folderStack.length > 0) {
          const parent = state.folderStack.pop();
          state.currentFolder = state.folderStack[state.folderStack.length - 1] || state.rootFolder;
          state.selectedIndex = 0;
          state.scrollOffset = 0;
          state.message = `Navigated up from ${parent?.title}`;
        } else {
          state.message = "Already at root folder.";
        }
        render();
        break;

      case "s":
        state.isSearching = true;
        state.message = "Typing filters list automatically. Press Enter to lock query.";
        render();
        break;

      case "c":
        state.searchQuery = "";
        state.selectedIndex = 0;
        state.scrollOffset = 0;
        state.message = "Search filter cleared.";
        render();
        break;

      case "e": {
        // Export current tree as JSON
        const exportPath = `export-${Date.now()}.json`;
        try {
          fs.writeFileSync(exportPath, JSON.stringify(state.currentFolder, null, 2));
          state.message = `Exported current folder context to: ${exportPath}`;
        } catch {
          state.message = "Failed to export JSON file.";
        }
        render();
        break;
      }

      case "q":
        exitTui();
        break;

      default:
        if (ch === "?") {
          state.showHelp = !state.showHelp;
          render();
        }
        break;
    }
  }

  const onResize = () => {
    render();
  };
  process.stdout.on("resize", onResize);

  function exitTui() {
    process.stdout.off("resize", onResize);
    // Exit alternate screen buffer and show terminal cursor
    process.stdout.write("\x1b[?1049l\x1b[?25h");
    process.stdin.removeListener("keypress", handleKeyPress);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.exit(0);
  }

  process.stdin.on("keypress", handleKeyPress);
  render();
}

function runCli() {
  const args = process.argv.slice(2);
  const parsed = {
    inputFile: "",
    outputFile: "",
    format: "tree" as "tree" | "flat",
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
      if (val === "flat" || val === "tree") {
        parsed.format = val;
      }
    } else if (arg === "-d" || arg === "--dates") {
      const val = args[++i];
      if (val === "date" || val === "iso" || val === "unix" || val === "none") {
        parsed.dates = val;
      }
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

  const result = parse(htmlContent, {
    format: parsed.format,
    normalizeDates: parsed.dates,
    includeIcon: parsed.includeIcon,
  });

  // Launch interactive browser if specified
  if (parsed.interactive) {
    // To navigate folders recursively, TUI expects the tree representation
    const treeResult = parse(htmlContent, {
      normalizeDates: parsed.dates,
      includeIcon: parsed.includeIcon,
    });
    startTui(treeResult);
    return;
  }

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

// Start execution
runCli();
