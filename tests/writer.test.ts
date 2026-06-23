import { describe, it, expect } from "vitest";
import { parse } from "../src/parser.js";
import { stringify } from "../src/writer.js";
import { Folder } from "../src/types.js";

describe("Bookmark Parser - stringification", () => {
  const originalTree: Folder = {
    type: "folder",
    title: "My Custom Bookmarks & Links",
    children: [
      {
        type: "folder",
        title: "Development & Testing <Code>",
        addDate: 1493012345,
        lastModified: 1493012346,
        personalToolbarFolder: true,
        folded: true,
        children: [
          {
            type: "bookmark",
            title: 'GitHub | "Social coding"',
            url: "https://github.com?q=test&arg=val",
            addDate: 1493012347,
            lastVisit: 1493012348,
            icon: "data:image/png;base64,123",
            tags: ["code", "social"],
            shortcutUrl: "gh",
            description: "An online platform for software hosting.",
          },
        ],
      },
    ],
  };

  it("should stringify a tree into formatted Netscape HTML", () => {
    const html = stringify(originalTree, { compact: false, title: "Custom Title" });

    // Assert that standard headers exist
    expect(html).toContain("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
    expect(html).toContain("<TITLE>Custom Title</TITLE>");
    expect(html).toContain("<H1>Custom Title</H1>");

    // Assert escaping of HTML special characters
    expect(html).toContain("Development &amp; Testing &lt;Code&gt;");
    expect(html).toContain("GitHub | &quot;Social coding&quot;");
    expect(html).toContain("https://github.com?q=test&amp;arg=val");

    // Assert attributes
    expect(html).toContain('ADD_DATE="1493012345"');
    expect(html).toContain('LAST_MODIFIED="1493012346"');
    expect(html).toContain('PERSONAL_TOOLBAR_FOLDER="true"');
    expect(html).toContain('FOLDED="true"');
    expect(html).toContain('ICON="data:image/png;base64,123"');
    expect(html).toContain('TAGS="code,social"');
    expect(html).toContain('SHORTCUTURL="gh"');

    // Assert description
    expect(html).toContain("<DD>An online platform for software hosting.");
  });

  it("should support compact minified HTML output", () => {
    const html = stringify(originalTree, { compact: true });
    // Should not contain newlines in between nested lists
    expect(html.includes("\n")).toBe(false);
  });

  it("should preserve structure in round-trip stringify/parse operation", () => {
    const html = stringify(originalTree);
    const parsed = parse(html, { normalizeDates: "unix" });

    expect(parsed.title).toBe("My Custom Bookmarks & Links");
    expect(parsed.children.length).toBe(1);
    const devFolder = parsed.children[0] as Folder;
    expect(devFolder.title).toBe("Development & Testing <Code>");
    expect(devFolder.addDate).toBe(1493012345);
    expect(devFolder.lastModified).toBe(1493012346);
    expect(devFolder.personalToolbarFolder).toBe(true);
    expect(devFolder.folded).toBe(true);

    const github = devFolder.children[0];
    expect(github.type).toBe("bookmark");
    if (github.type === "bookmark") {
      expect(github.title).toBe('GitHub | "Social coding"');
      expect(github.url).toBe("https://github.com?q=test&arg=val");
      expect(github.addDate).toBe(1493012347);
      expect(github.lastVisit).toBe(1493012348);
      expect(github.icon).toBe("data:image/png;base64,123");
      expect(github.tags).toEqual(["code", "social"]);
      expect(github.shortcutUrl).toBe("gh");
      expect(github.description).toBe("An online platform for software hosting.");
    }
  });
});
