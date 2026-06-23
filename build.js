import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Clean dist folder
if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true, force: true });
}

// Compile ESM
console.log("Building ESM...");
execSync("npx tsc -p tsconfig.json", { stdio: "inherit" });

// Compile CJS
console.log("Building CJS...");
execSync("npx tsc -p tsconfig.cjs.json", { stdio: "inherit" });

// Prepend shebang helper
const shebang = "#!/usr/bin/env node\n";
function ensureShebang(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.startsWith("#!")) {
    content = shebang + content;
    fs.writeFileSync(filePath, content);
  }
}

// Ensure shebang for ESM cli.js
const esmCli = path.join("dist", "cli.js");
if (fs.existsSync(esmCli)) {
  ensureShebang(esmCli);
}

// Rewrite imports and rename files under dist/cjs to dist/*.cjs
const cjsDir = path.join("dist", "cjs");
if (fs.existsSync(cjsDir)) {
  const files = fs.readdirSync(cjsDir);
  for (const file of files) {
    if (file.endsWith(".js")) {
      const filePath = path.join(cjsDir, file);
      let content = fs.readFileSync(filePath, "utf8");

      // Update requires for local files (e.g. require('./parser') -> require('./parser.cjs'))
      content = content.replace(/require\(['"](\.\.?\/[^'"]+)['"]\)/g, (match, p1) => {
        if (p1.endsWith(".js")) {
          return `require("${p1.slice(0, -3)}.cjs")`;
        }
        if (p1.endsWith(".cjs")) {
          return `require("${p1}")`;
        }
        return `require("${p1}.cjs")`;
      });

      const newName = file.replace(/\.js$/, ".cjs");
      const destPath = path.join("dist", newName);
      fs.writeFileSync(destPath, content);

      // Ensure shebang for CJS cli.cjs
      if (newName === "cli.cjs") {
        ensureShebang(destPath);
      }
    }
  }
  fs.rmSync(cjsDir, { recursive: true, force: true });
}

console.log("Build complete.");
