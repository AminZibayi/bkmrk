import { Folder, Bookmark } from "../../../src/types.js";

/**
 * Deep clones a folder structure.
 */
export function cloneFolder(folder: Folder): Folder {
  return {
    ...folder,
    children: folder.children.map((child) => {
      if (child.type === "folder") {
        return cloneFolder(child);
      }
      return { ...child };
    }),
  };
}

/**
 * Recursively cleans tracking parameters from bookmark URLs in a folder.
 */
export function cleanFolderUrls(folder: Folder): Folder {
  const trackerParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "msclkid",
    "yclid",
  ];

  const clean = (f: Folder): Folder => {
    return {
      ...f,
      children: f.children.map((child) => {
        if (child.type === "folder") {
          return clean(child);
        }

        try {
          const urlObj = new URL(child.url);
          let changed = false;
          trackerParams.forEach((param) => {
            if (urlObj.searchParams.has(param)) {
              urlObj.searchParams.delete(param);
              changed = true;
            }
          });

          return changed ? { ...child, url: urlObj.toString() } : child;
        } catch {
          // If URL is invalid, return it unmodified
          return child;
        }
      }),
    };
  };

  return clean(cloneFolder(folder));
}

/**
 * Recursively removes duplicate bookmark URLs.
 * Keeps only the first occurrence of each URL.
 */
export function deduplicateFolder(folder: Folder): { cleanTree: Folder; removedCount: number } {
  const seenUrls = new Set<string>();
  let removedCount = 0;

  const dedup = (f: Folder): Folder => {
    const newChildren: (Bookmark | Folder)[] = [];

    for (const child of f.children) {
      if (child.type === "folder") {
        newChildren.push(dedup(child));
      } else {
        // Normalize URL for comparison (e.g. strip trailing slash)
        let normalizedUrl = child.url.trim();
        try {
          const urlObj = new URL(normalizedUrl);
          normalizedUrl = urlObj.origin + urlObj.pathname + urlObj.search;
        } catch {}

        if (seenUrls.has(normalizedUrl)) {
          removedCount++;
        } else {
          seenUrls.add(normalizedUrl);
          newChildren.push(child);
        }
      }
    }

    return {
      ...f,
      children: newChildren,
    };
  };

  const cleanTree = dedup(cloneFolder(folder));
  return { cleanTree, removedCount };
}

export interface BookmarkStats {
  totalBookmarks: number;
  totalFolders: number;
  duplicateCount: number;
  topDomains: { domain: string; count: number }[];
}

/**
 * Extracts comprehensive statistics from a folder tree.
 */
export function getStats(folder: Folder): BookmarkStats {
  let totalBookmarks = 0;
  let totalFolders = 0;
  const seenUrls = new Set<string>();
  let duplicateCount = 0;
  const domainCounts: Record<string, number> = {};

  const traverse = (f: Folder) => {
    totalFolders++;
    for (const child of f.children) {
      if (child.type === "folder") {
        traverse(child);
      } else {
        totalBookmarks++;

        let normalizedUrl = child.url.trim();
        try {
          const urlObj = new URL(normalizedUrl);
          normalizedUrl = urlObj.origin + urlObj.pathname + urlObj.search;
          const host = urlObj.hostname.replace(/^www\./, "");
          domainCounts[host] = (domainCounts[host] || 0) + 1;
        } catch {
          domainCounts["invalid-url"] = (domainCounts["invalid-url"] || 0) + 1;
        }

        if (seenUrls.has(normalizedUrl)) {
          duplicateCount++;
        } else {
          seenUrls.add(normalizedUrl);
        }
      }
    }
  };

  traverse(folder);
  // Exclude the root folder from total folders count
  const adjustedFolders = Math.max(0, totalFolders - 1);

  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalBookmarks,
    totalFolders: adjustedFolders,
    duplicateCount,
    topDomains,
  };
}

/**
 * Flattens all bookmarks in the tree with their paths.
 */
export interface PathBookmark extends Bookmark {
  path: string[];
}

export function getAllBookmarksWithPath(
  folder: Folder,
  currentPath: string[] = []
): PathBookmark[] {
  const bookmarks: PathBookmark[] = [];

  const traverse = (f: Folder, path: string[]) => {
    const newPath = f.title ? [...path, f.title] : path;
    for (const child of f.children) {
      if (child.type === "folder") {
        traverse(child, newPath);
      } else {
        bookmarks.push({
          ...child,
          path: newPath,
        });
      }
    }
  };

  traverse(folder, currentPath);
  return bookmarks;
}
