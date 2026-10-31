import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.resolve(projectDirectory, "closed-dist");

if (outputDirectory !== path.join(projectDirectory, "closed-dist")) {
  throw new Error("Unexpected static output directory");
}

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
cpSync(
  path.join(projectDirectory, "public", "close.html"),
  path.join(outputDirectory, "close.html"),
);

console.log("Built static closure site with close.html only.");
