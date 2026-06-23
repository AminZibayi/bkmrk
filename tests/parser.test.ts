import { describe, it, expect } from "vitest";
import { parse } from "../src/parser.js";
import { Folder } from "../src/types.js";

describe("Bookmark Parser - html parsing", () => {
  const sampleHtml = `
    <!DOCTYPE NETSCAPE-Bookmark-file-1>
    <!-- This is an automatically generated file. -->
    <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
    <TITLE>Bookmarks Export</TITLE>
    <H1>Bookmarks</H1>
    <DL><p>
      <DT><H3 ADD_DATE="1493012345" LAST_MODIFIED="1493012346" PERSONAL_TOOLBAR_FOLDER="true">Toolbar Folder</H3>
      <DL><p>
        <DT><A HREF="https://github.com" ADD_DATE="1493012347" LAST_VISIT="1493012348" ICON="data:image/png;base64,abc" TAGS="dev,git" SHORTCUTURL="gh">GitHub</A>
        <DD>GitHub home page
        <DT><H3 ADD_DATE="1493012349" FOLDED="true">Sub Folder</H3>
        <DL><p>
          <DT><A HREF="https://google.com" ADD_DATE="1493012350">Google</A>
        </DL><p>
      </DL><p>
    </DL><p>
  `;

  it("should parse standard HTML structure into a nested folder tree", () => {
    const result = parse(sampleHtml, { normalizeDates: "unix" });

    expect(result.title).toBe("Bookmarks Export");
    expect(result.type).toBe("folder");
    expect(result.children.length).toBe(1);

    const toolbar = result.children[0] as Folder;
    expect(toolbar.type).toBe("folder");
    expect(toolbar.title).toBe("Toolbar Folder");
    expect(toolbar.addDate).toBe(1493012345);
    expect(toolbar.lastModified).toBe(1493012346);
    expect(toolbar.personalToolbarFolder).toBe(true);
    expect(toolbar.children.length).toBe(2);

    const github = toolbar.children[0];
    expect(github.type).toBe("bookmark");
    if (github.type === "bookmark") {
      expect(github.title).toBe("GitHub");
      expect(github.url).toBe("https://github.com");
      expect(github.addDate).toBe(1493012347);
      expect(github.lastVisit).toBe(1493012348);
      expect(github.icon).toBe("data:image/png;base64,abc");
      expect(github.tags).toEqual(["dev", "git"]);
      expect(github.shortcutUrl).toBe("gh");
      expect(github.description).toBe("GitHub home page");
    }

    const subFolder = toolbar.children[1] as Folder;
    expect(subFolder.type).toBe("folder");
    expect(subFolder.title).toBe("Sub Folder");
    expect(subFolder.folded).toBe(true);
    expect(subFolder.children.length).toBe(1);

    const google = subFolder.children[0];
    expect(google.type).toBe("bookmark");
    if (google.type === "bookmark") {
      expect(google.title).toBe("Google");
      expect(google.url).toBe("https://google.com");
    }
  });

  it("should parse flat list of bookmarks with parent folder paths", () => {
    const result = parse(sampleHtml, { format: "flat", normalizeDates: "unix" });

    expect(result.length).toBe(2);

    expect(result[0].title).toBe("GitHub");
    expect(result[0].url).toBe("https://github.com");
    expect(result[0].path).toEqual(["Toolbar Folder"]);
    expect(result[0].description).toBe("GitHub home page");
    expect(result[0].tags).toEqual(["dev", "git"]);
    expect(result[0].icon).toBe("data:image/png;base64,abc");

    expect(result[1].title).toBe("Google");
    expect(result[1].url).toBe("https://google.com");
    expect(result[1].path).toEqual(["Toolbar Folder", "Sub Folder"]);
  });

  it("should support date normalization modes", () => {
    // Mode: date (JavaScript Date)
    const resDate = parse(sampleHtml, { normalizeDates: "date" });
    const toolbarDate = resDate.children[0] as Folder;
    expect(toolbarDate.addDate).toBeInstanceOf(Date);
    expect((toolbarDate.addDate as Date).getTime()).toBe(1493012345000);

    // Mode: iso
    const resIso = parse(sampleHtml, { normalizeDates: "iso" });
    const toolbarIso = resIso.children[0] as Folder;
    expect(typeof toolbarIso.addDate).toBe("string");
    expect(toolbarIso.addDate).toBe(new Date(1493012345000).toISOString());

    // Mode: none (raw string)
    const resNone = parse(sampleHtml, { normalizeDates: "none" });
    const toolbarNone = resNone.children[0] as Folder;
    expect(toolbarNone.addDate).toBe("1493012345");
  });

  it("should respect includeIcon flag to strip icons", () => {
    const resWithIcon = parse(sampleHtml, { includeIcon: true });
    const toolbarWithIcon = resWithIcon.children[0] as Folder;
    const githubWithIcon = toolbarWithIcon.children[0];
    if (githubWithIcon.type === "bookmark") {
      expect(githubWithIcon.icon).toBe("data:image/png;base64,abc");
    }

    const resNoIcon = parse(sampleHtml, { includeIcon: false });
    const toolbarNoIcon = resNoIcon.children[0] as Folder;
    const githubNoIcon = toolbarNoIcon.children[0];
    if (githubNoIcon.type === "bookmark") {
      expect(githubNoIcon.icon).toBeUndefined();
    }
  });

  it("should parse into flat key-value object of { [title]: url }", () => {
    const result = parse(sampleHtml, { format: "kv" });
    expect(result).toEqual({
      GitHub: "https://github.com",
      Google: "https://google.com",
    });
  });

  it("should recover gracefully from malformed HTML with unclosed tags", () => {
    const malformedHtml = `
      <TITLE>Malformed Export</TITLE>
      <DL>
        <DT><H3>Unclosed Folder
        <DL>
          <DT><A HREF="https://example.com">Example
          <DT><A HREF="https://anotherexample.com">Another Example</A>
        </DL>
      </DL>
    `;

    const result = parse(malformedHtml);
    expect(result.title).toBe("Malformed Export");

    const folder = result.children[0] as Folder;
    expect(folder.title).toBe("Unclosed Folder");
    expect(folder.children.length).toBe(2);

    const b1 = folder.children[0];
    expect(b1.type).toBe("bookmark");
    if (b1.type === "bookmark") {
      expect(b1.title).toBe("Example");
      expect(b1.url).toBe("https://example.com");
    }

    const b2 = folder.children[1];
    expect(b2.type).toBe("bookmark");
    if (b2.type === "bookmark") {
      expect(b2.title).toBe("Another Example");
      expect(b2.url).toBe("https://anotherexample.com");
    }
  });
});
