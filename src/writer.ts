import { Folder, Bookmark, StringifyOptions } from "./types.js";

/**
 * Escapes standard HTML special characters.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normalizes date representations back into Unix timestamp strings.
 */
function formatDate(d: Date | string | number | undefined): string {
  if (d === undefined || d === null) return "";
  if (d instanceof Date) {
    return Math.floor(d.getTime() / 1000).toString();
  }
  if (typeof d === "number") {
    return d.toString();
  }
  if (typeof d === "string") {
    if (/^\d+$/.test(d)) {
      return d;
    }
    const date = new Date(d);
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000).toString();
    }
  }
  return "";
}

/**
 * Serializes a folder structure or bookmark list back to Netscape HTML format.
 */
export function stringify(folder: Folder, options?: StringifyOptions): string {
  const compact = options?.compact ?? false;
  const title = options?.title ?? folder.title ?? "Bookmarks";
  const indentStr = compact ? "" : "    ";
  const nl = compact ? "" : "\n";

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>${nl}`;
  html += `<!-- This is an automatically generated file.${nl}`;
  html += `     It will be read and overwritten.${nl}`;
  html += `     DO NOT EDIT! -->${nl}`;
  html += `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">${nl}`;
  html += `<TITLE>${escapeHtml(title)}</TITLE>${nl}`;
  html += `<H1>${escapeHtml(title)}</H1>${nl}`;

  function serializeFolder(f: Folder, depth: number): string {
    const spaces = indentStr.repeat(depth);
    let str = `${spaces}<DT><H3`;

    const addDate = formatDate(f.addDate);
    if (addDate) str += ` ADD_DATE="${addDate}"`;
    const lastMod = formatDate(f.lastModified);
    if (lastMod) str += ` LAST_MODIFIED="${lastMod}"`;
    if (f.personalToolbarFolder) str += ' PERSONAL_TOOLBAR_FOLDER="true"';
    if (f.folded) str += ' FOLDED="true"';

    str += `>${escapeHtml(f.title)}</H3>${nl}`;
    if (f.description) {
      str += `${spaces}<DD>${escapeHtml(f.description)}${nl}`;
    }
    str += `${spaces}<DL><p>${nl}`;
    for (const child of f.children) {
      if (child.type === "folder") {
        str += serializeFolder(child, depth + 1);
      } else {
        str += serializeBookmark(child, depth + 1);
      }
    }
    str += `${spaces}</DL><p>${nl}`;
    return str;
  }

  function serializeBookmark(b: Bookmark, depth: number): string {
    const spaces = indentStr.repeat(depth);
    let str = `${spaces}<DT><A HREF="${escapeHtml(b.url)}"`;

    const addDate = formatDate(b.addDate);
    if (addDate) str += ` ADD_DATE="${addDate}"`;
    const lastVisit = formatDate(b.lastVisit);
    if (lastVisit) str += ` LAST_VISIT="${lastVisit}"`;
    const lastMod = formatDate(b.lastModified);
    if (lastMod) str += ` LAST_MODIFIED="${lastMod}"`;
    if (b.icon) str += ` ICON="${escapeHtml(b.icon)}"`;
    if (b.tags && b.tags.length > 0) {
      str += ` TAGS="${escapeHtml(b.tags.join(","))}"`;
    }
    if (b.shortcutUrl) str += ` SHORTCUTURL="${escapeHtml(b.shortcutUrl)}"`;

    str += `>${escapeHtml(b.title)}</A>${nl}`;
    if (b.description) {
      str += `${spaces}<DD>${escapeHtml(b.description)}${nl}`;
    }
    return str;
  }

  html += `<DL><p>${nl}`;
  for (const child of folder.children) {
    if (child.type === "folder") {
      html += serializeFolder(child, 1);
    } else {
      html += serializeBookmark(child, 1);
    }
  }
  html += `</DL><p>${nl}`;
  return html;
}
