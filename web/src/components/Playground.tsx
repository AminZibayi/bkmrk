import React, { useState, useRef, useMemo } from "react";
import {
  IconFolder,
  IconFolderOpen,
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconCopy,
  IconCheck,
  IconDownload,
  IconTrash,
  IconBrush,
  IconLink,
  IconArrowLeft,
} from "@tabler/icons-react";
import { Folder, Bookmark } from "../../../src/types.js";
import { parse } from "../../../src/parser.js";
import { stringify } from "../../../src/writer.js";
import {
  cleanFolderUrls,
  deduplicateFolder,
  getStats,
  getAllBookmarksWithPath,
  PathBookmark,
} from "../utils/bookmarkOps.js";

// Helper to download files in browser
function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface FolderTreeProps {
  folder: Folder;
  selectedFolder: Folder | null;
  onSelect: (folder: Folder) => void;
  depth?: number;
}

const FolderTree: React.FC<FolderTreeProps> = ({ folder, selectedFolder, onSelect, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasSubfolders = useMemo(() => {
    return folder.children.some((child) => child.type === "folder");
  }, [folder.children]);

  const isSelected = selectedFolder === folder;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(folder)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? "bg-emerald-950/30 text-emerald-400 border border-emerald-500/20"
            : "hover:bg-neutral-900/50 text-neutral-300 hover:text-neutral-200 border border-transparent"
        }`}
        style={{ paddingLeft: `${Math.max(12, depth * 16)}px` }}
      >
        <button
          onClick={handleToggle}
          className={`p-0.5 hover:bg-neutral-800 rounded transition-colors ${
            hasSubfolders ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </button>
        {isOpen ? (
          <IconFolderOpen
            size={16}
            className={isSelected ? "text-emerald-400" : "text-neutral-500"}
          />
        ) : (
          <IconFolder size={16} className={isSelected ? "text-emerald-400" : "text-neutral-500"} />
        )}
        <span className="text-sm font-medium truncate max-w-[200px]">
          {folder.title || "Untitled Folder"}
        </span>
      </div>

      {isOpen && hasSubfolders && (
        <div className="mt-1 flex flex-col gap-0.5">
          {folder.children
            .filter((child): child is Folder => child.type === "folder")
            .map((subfolder, idx) => (
              <FolderTree
                key={`${subfolder.title}-${idx}`}
                folder={subfolder}
                selectedFolder={selectedFolder}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default function Playground() {
  const [bookmarksTree, setBookmarksTree] = useState<Folder | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse HTML string to tree
  const handleParse = (html: string) => {
    try {
      const parsed = parse(html, { normalizeDates: "unix" });
      setBookmarksTree(parsed);
      setActiveFolder(parsed);
      showToast("Bookmarks loaded successfully");
    } catch {
      showToast("Failed to parse bookmark file. Please ensure it is a valid Netscape HTML export.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => {
      setCopiedUrl(null);
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        handleParse(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        handleParse(text);
      }
    };
    reader.readAsText(file);
  };

  // URL cleaning action
  const handleCleanUrls = () => {
    if (!bookmarksTree) return;
    const cleaned = cleanFolderUrls(bookmarksTree);
    setBookmarksTree(cleaned);

    // Reset active folder reference to the new matching node in the cleaned tree
    if (activeFolder === bookmarksTree) {
      setActiveFolder(cleaned);
    } else {
      // Simple fallback to root
      setActiveFolder(cleaned);
    }
    showToast("Tracking parameters removed");
  };

  // De-duplication action
  const handleDeduplicate = () => {
    if (!bookmarksTree) return;
    const { cleanTree, removedCount } = deduplicateFolder(bookmarksTree);
    setBookmarksTree(cleanTree);
    setActiveFolder(cleanTree);
    showToast(`Removed ${removedCount} duplicate bookmarks`);
  };

  // Statistics calculation
  const stats = useMemo(() => {
    if (!bookmarksTree) return null;
    return getStats(bookmarksTree);
  }, [bookmarksTree]);

  // Flattened list of bookmarks for searching
  const allBookmarksWithPath = useMemo(() => {
    if (!bookmarksTree) return [];
    return getAllBookmarksWithPath(bookmarksTree);
  }, [bookmarksTree]);

  // Filtered bookmarks to show
  const visibleBookmarks = useMemo(() => {
    if (!bookmarksTree) return [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return allBookmarksWithPath.filter(
        (b) => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query)
      );
    }

    if (!activeFolder) return [];
    return activeFolder.children.filter((child): child is Bookmark => child.type === "bookmark");
  }, [bookmarksTree, activeFolder, searchQuery, allBookmarksWithPath]);

  // Export handlers
  const handleExportHtml = () => {
    if (!bookmarksTree) return;
    const html = stringify(bookmarksTree);
    downloadFile(html, "bookmarks_cleaned.html", "text/html");
    setIsExportOpen(false);
  };

  const handleExportJsonTree = () => {
    if (!bookmarksTree) return;
    downloadFile(JSON.stringify(bookmarksTree, null, 2), "bookmarks_tree.json", "application/json");
    setIsExportOpen(false);
  };

  const handleExportJsonFlat = () => {
    if (!bookmarksTree) return;
    const flat = allBookmarksWithPath.map(({ title, url, path }) => ({ title, url, path }));
    downloadFile(JSON.stringify(flat, null, 2), "bookmarks_flat.json", "application/json");
    setIsExportOpen(false);
  };

  const handleExportJsonKv = () => {
    if (!bookmarksTree) return;
    const kv: Record<string, string> = {};
    allBookmarksWithPath.forEach((b) => {
      kv[b.title] = b.url;
    });
    downloadFile(JSON.stringify(kv, null, 2), "bookmarks_kv.json", "application/json");
    setIsExportOpen(false);
  };

  return (
    <div id="workspace" className="relative max-w-6xl mx-auto px-6 py-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 glass-panel border-emerald-500/30 bg-neutral-950/90 text-neutral-200 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <IconCheck className="text-emerald-400" size={18} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {!bookmarksTree ? (
        /* File Drop Zone / Loader (Pre-load state) */
        <div className="max-w-xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".html,.htm"
            className="hidden"
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer transition-all border border-dashed rounded-2xl p-12 text-center relative ${
              isDragging
                ? "border-emerald-400 bg-emerald-950/10 scale-[0.99]"
                : "border-neutral-800 bg-neutral-950/40 hover:border-emerald-500/40 hover:bg-neutral-950/60"
            }`}
          >
            {/* Concentric Double-Bezel Rings */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full border border-neutral-800/80 flex items-center justify-center p-3">
                <div className="w-full h-full rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center">
                  <IconLink className="text-emerald-400" size={24} />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Import Bookmarks</h3>
            <p className="text-sm text-neutral-400 mb-6 max-w-xs mx-auto">
              Drag and drop your HTML bookmarks file here, or click to browse local files.
            </p>
          </div>
        </div>
      ) : (
        /* Workspace layout (Post-load state) */
        <div className="flex flex-col gap-6">
          {/* Header Actions bar & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-4 flex flex-col justify-center">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                Total Bookmarks
              </span>
              <span className="text-2xl font-bold text-white mt-1">{stats?.totalBookmarks}</span>
            </div>
            <div className="glass-panel rounded-xl p-4 flex flex-col justify-center">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                Total Folders
              </span>
              <span className="text-2xl font-bold text-white mt-1">{stats?.totalFolders}</span>
            </div>
            <div className="glass-panel rounded-xl p-4 flex flex-col justify-center">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                Duplicates Found
              </span>
              <span className="text-2xl font-bold text-white mt-1">{stats?.duplicateCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBookmarksTree(null);
                  setActiveFolder(null);
                }}
                className="w-full h-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-neutral-400 hover:text-neutral-200 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-xl transition-all cursor-pointer"
              >
                <IconArrowLeft size={16} />
                <span>Upload New</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Panel: Folder Tree Explorer (3 cols) */}
            <div className="lg:col-span-4 glass-panel rounded-xl p-5 min-h-[450px] max-h-[600px] overflow-y-auto">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-900 pb-2">
                Folder Hierarchy
              </h3>
              <div className="flex flex-col gap-1">
                <FolderTree
                  folder={bookmarksTree}
                  selectedFolder={activeFolder}
                  onSelect={(f) => {
                    setSearchQuery("");
                    setActiveFolder(f);
                  }}
                />
              </div>
            </div>

            {/* Right Panel: Content list & Operations (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Operations Toolbar */}
              <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between relative z-30">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <IconSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bookmarks..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-900 border border-neutral-800 focus:border-emerald-500/50 rounded-lg text-neutral-200 outline-none transition-colors"
                  />
                </div>

                {/* Operations Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleCleanUrls}
                    title="Remove parameters like utm_source, fbclid from URLs"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-850 hover:border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <IconBrush size={14} className="text-emerald-400" />
                    <span className="hidden sm:inline">Clean</span>
                  </button>

                  <button
                    onClick={handleDeduplicate}
                    title="Remove duplicate bookmark links based on URL"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-850 hover:border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <IconTrash size={14} className="text-emerald-400" />
                    <span className="hidden sm:inline">Deduplicate</span>
                  </button>

                  {/* Export Select dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsExportOpen(!isExportOpen)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <IconDownload size={14} />
                      <span>Export</span>
                    </button>

                    {isExportOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsExportOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-neutral-950 border border-neutral-850 py-1 z-50">
                          <button
                            onClick={handleExportHtml}
                            className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                          >
                            Netscape HTML
                          </button>
                          <button
                            onClick={handleExportJsonTree}
                            className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                          >
                            JSON Tree
                          </button>
                          <button
                            onClick={handleExportJsonFlat}
                            className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                          >
                            JSON Flat List
                          </button>
                          <button
                            onClick={handleExportJsonKv}
                            className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                          >
                            JSON Key-Value
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bookmark List Display */}
              <div className="glass-panel rounded-xl p-5 min-h-[380px] max-h-[500px] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b border-neutral-900 pb-2">
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    {searchQuery ? "Search Results" : activeFolder?.title || "Root Folder"} (
                    {visibleBookmarks.length})
                  </h4>
                </div>

                {visibleBookmarks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                    <IconLink size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">No bookmarks found in this view.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {visibleBookmarks.map((bookmark, idx) => {
                      const pathBookmark = bookmark as PathBookmark;
                      const hasPath = pathBookmark.path && pathBookmark.path.length > 0;

                      return (
                        <div
                          key={`${bookmark.url}-${idx}`}
                          className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-900 rounded-lg hover:border-neutral-850 transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0 max-w-[85%]">
                            {bookmark.icon ? (
                              <img
                                src={bookmark.icon}
                                alt=""
                                className="w-4 h-4 mt-0.5 rounded flex-shrink-0"
                                onError={(e) => {
                                  // Fallback to IconLink if image loading fails
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <IconLink
                                size={16}
                                className="text-emerald-400 mt-0.5 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-semibold text-white truncate">
                                {bookmark.title || "Untitled"}
                              </span>
                              <span className="text-xs text-neutral-500 truncate mt-0.5">
                                {bookmark.url}
                              </span>
                              {hasPath && (
                                <span className="text-[10px] text-emerald-400/60 truncate mt-1">
                                  {pathBookmark.path.join(" > ")}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyUrl(bookmark.url)}
                              className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/20 transition-all cursor-pointer"
                              title="Copy URL"
                            >
                              {copiedUrl === bookmark.url ? (
                                <IconCheck size={14} className="text-emerald-400" />
                              ) : (
                                <IconCopy size={14} />
                              )}
                            </button>
                            <a
                              href={bookmark.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/20 transition-all cursor-pointer"
                              title="Open URL"
                            >
                              <IconChevronRight size={14} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
