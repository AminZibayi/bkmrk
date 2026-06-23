import { Bookmark, Folder, FlatBookmark, ParseOptions } from "./types.js";

/**
 * Decodes standard HTML entities commonly found in bookmark files.
 */
export function decodeEntities(str: string): string {
  if (!str.includes("&")) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Parses tag attributes (e.g. key="value" or key=value) into a record of lowercase keys.
 */
export function parseAttributes(tagStr: string | undefined): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!tagStr) return attrs;
  const attrRegex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;
  while ((match = attrRegex.exec(tagStr)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[key] = decodeEntities(val);
  }
  return attrs;
}

/**
 * Parses date attributes using the selected date normalization mode.
 */
function parseDate(
  val: string | undefined,
  mode: "date" | "iso" | "unix" | "none"
): Date | string | number | undefined {
  if (!val) return undefined;
  const num = parseInt(val, 10);
  if (isNaN(num)) return undefined;

  const ms = num * 1000;
  if (mode === "unix") return num;
  if (mode === "iso") return new Date(ms).toISOString();
  if (mode === "date") return new Date(ms);
  return val; // "none" (returns raw string)
}

/**
 * Flattens a Folder structure into an array of FlatBookmark objects.
 */
function flattenFolder(
  folder: Folder,
  currentPath: string[],
  includeIcon: boolean
): FlatBookmark[] {
  const result: FlatBookmark[] = [];
  for (const child of folder.children) {
    if (child.type === "bookmark") {
      const flat: FlatBookmark = {
        title: child.title,
        url: child.url,
        path: [...currentPath],
      };
      if (child.addDate !== undefined) flat.addDate = child.addDate;
      if (child.lastVisit !== undefined) flat.lastVisit = child.lastVisit;
      if (child.lastModified !== undefined) flat.lastModified = child.lastModified;
      if (child.description !== undefined) flat.description = child.description;
      if (child.tags !== undefined) flat.tags = child.tags;
      if (child.shortcutUrl !== undefined) flat.shortcutUrl = child.shortcutUrl;
      if (includeIcon && child.icon !== undefined) flat.icon = child.icon;
      result.push(flat);
    } else if (child.type === "folder") {
      result.push(...flattenFolder(child, [...currentPath, child.title], includeIcon));
    }
  }
  return result;
}

/**
 * Core parsing state-machine to extract Netscape bookmarks.
 */
export function parse(html: string, options: ParseOptions & { format: "flat" }): FlatBookmark[];
export function parse(html: string, options?: ParseOptions & { format?: "tree" }): Folder;
export function parse(html: string, options?: ParseOptions): Folder | FlatBookmark[];
export function parse(html: string, options?: ParseOptions): Folder | FlatBookmark[] {
  const format = options?.format ?? "tree";
  const normalizeDates = options?.normalizeDates ?? "date";
  const includeIcon = options?.includeIcon ?? true;

  // Clean HTML from comments
  const cleanedHtml = html.replace(/<!--[\s\S]*?-->/g, "");

  const root: Folder = {
    type: "folder",
    title: "Bookmarks",
    children: [],
  };

  const stack: Folder[] = [root];
  let currentFolder = root;
  let pendingFolder: Folder | null = null;
  let lastNode: Bookmark | Folder | null = null;
  let hasSeenRootDL = false;

  // State of the active open tag (TITLE, H3, A, DD) expecting text content next
  let activeTag: { name: string; attrs: Record<string, string>; textStart: number } | null = null;

  const tagRegex = /<(DL|H3|A|DD|TITLE|DT|P|HR)(?:\s+([^>]*))?>|<\/(DL|H3|A|TITLE|DT|P)>/gi;
  let match;

  // Flushes the pending folder to the current folder children if we see a bookmark/another folder
  function flushPendingFolder() {
    if (pendingFolder) {
      currentFolder.children.push(pendingFolder);
      pendingFolder = null;
    }
  }

  // Resolves the accumulated text for an active tag
  function resolveActiveTag(endIndex: number) {
    if (!activeTag) return;

    const rawText = cleanedHtml.substring(activeTag.textStart, endIndex);
    const text = decodeEntities(rawText.trim());

    switch (activeTag.name.toUpperCase()) {
      case "TITLE":
        if (text) {
          root.title = text;
        }
        break;

      case "H3": {
        flushPendingFolder();
        const folder: Folder = {
          type: "folder",
          title: text || "Untitled Folder",
          children: [],
        };
        const addDate = parseDate(activeTag.attrs.add_date, normalizeDates);
        const lastMod = parseDate(activeTag.attrs.last_modified, normalizeDates);

        if (addDate !== undefined) folder.addDate = addDate;
        if (lastMod !== undefined) folder.lastModified = lastMod;
        if (activeTag.attrs.folded === "true") folder.folded = true;
        if (activeTag.attrs.personal_toolbar_folder === "true") {
          folder.personalToolbarFolder = true;
        }

        pendingFolder = folder;
        lastNode = folder;
        break;
      }

      case "A": {
        flushPendingFolder();
        const bookmark: Bookmark = {
          type: "bookmark",
          title: text || "",
          url: activeTag.attrs.href || "",
        };

        const addDate = parseDate(activeTag.attrs.add_date, normalizeDates);
        const lastVisit = parseDate(activeTag.attrs.last_visit, normalizeDates);
        const lastMod = parseDate(activeTag.attrs.last_modified, normalizeDates);

        if (addDate !== undefined) bookmark.addDate = addDate;
        if (lastVisit !== undefined) bookmark.lastVisit = lastVisit;
        if (lastMod !== undefined) bookmark.lastModified = lastMod;
        if (includeIcon && activeTag.attrs.icon) {
          bookmark.icon = activeTag.attrs.icon;
        }
        if (activeTag.attrs.tags) {
          bookmark.tags = activeTag.attrs.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }
        if (activeTag.attrs.shortcuturl) {
          bookmark.shortcutUrl = activeTag.attrs.shortcuturl;
        }

        currentFolder.children.push(bookmark);
        lastNode = bookmark;
        break;
      }

      case "DD":
        if (lastNode && text) {
          lastNode.description = text;
        }
        break;
    }

    activeTag = null;
  }

  while ((match = tagRegex.exec(cleanedHtml)) !== null) {
    const isClosing = match[0].startsWith("</");
    const tagName = (match[1] ?? match[3]).toUpperCase();
    const tagAttrs = match[2];

    // Whenever a new tag is found, resolve any active text block up to this tag's start
    if (activeTag) {
      resolveActiveTag(match.index);
    }

    if (!isClosing) {
      if (tagName === "DL") {
        if (pendingFolder) {
          // Enter nested folder context
          currentFolder.children.push(pendingFolder);
          stack.push(pendingFolder);
          currentFolder = pendingFolder;
          pendingFolder = null;
        } else if (!hasSeenRootDL) {
          hasSeenRootDL = true;
        } else {
          // Subsequent DL without H3 folder -> Push currentFolder onto stack to keep stack balanced
          // without creating an empty anonymous folder.
          stack.push(currentFolder);
        }
      } else if (tagName !== "DT" && tagName !== "P" && tagName !== "HR") {
        // Prepare active open tag context
        activeTag = {
          name: tagName,
          attrs: parseAttributes(tagAttrs),
          textStart: match.index + match[0].length,
        };
      }
    } else {
      // Closing tag
      if (tagName === "DL") {
        flushPendingFolder();
        if (stack.length > 1) {
          stack.pop();
          currentFolder = stack[stack.length - 1];
        }
      }
    }
  }

  // Resolve any tailing tag active state
  if (activeTag) {
    resolveActiveTag(cleanedHtml.length);
  }

  // Flush any final pending folder
  flushPendingFolder();

  if (format === "flat") {
    return flattenFolder(root, [], includeIcon);
  }

  return root;
}
