export interface Bookmark {
  type: "bookmark";
  title: string;
  url: string;
  addDate?: Date | string | number;
  lastVisit?: Date | string | number;
  lastModified?: Date | string | number;
  icon?: string;
  tags?: string[];
  shortcutUrl?: string;
  description?: string;
}

export interface Folder {
  type: "folder";
  title: string;
  addDate?: Date | string | number;
  lastModified?: Date | string | number;
  personalToolbarFolder?: boolean;
  folded?: boolean;
  children: (Bookmark | Folder)[];
  description?: string;
}

export interface FlatBookmark {
  title: string;
  url: string;
  path: string[];
  addDate?: Date | string | number;
  lastVisit?: Date | string | number;
  lastModified?: Date | string | number;
  icon?: string;
  tags?: string[];
  shortcutUrl?: string;
  description?: string;
}

export interface ParseOptions {
  /**
   * Output format.
   * - 'tree': hierarchical tree structure (default)
   * - 'flat': flat list of bookmarks with their folder paths
   * @default 'tree'
   */
  format?: "tree" | "flat";

  /**
   * Date normalization mode.
   * - 'date': JavaScript Date objects (default)
   * - 'iso': ISO 8601 strings
   * - 'unix': Unix timestamps in seconds
   * - 'none': Raw string values from the file
   * @default 'date'
   */
  normalizeDates?: "date" | "iso" | "unix" | "none";

  /**
   * Whether to include the base64 favicon data in the output.
   * Setting this to false reduces the output size.
   * @default true
   */
  includeIcon?: boolean;
}

export interface StringifyOptions {
  /**
   * If true, produces minified HTML without indentations/newlines.
   * @default false
   */
  compact?: boolean;

  /**
   * Document title.
   * @default 'Bookmarks'
   */
  title?: string;
}
