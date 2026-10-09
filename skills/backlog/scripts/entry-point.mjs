/**
 * Whether a module is the script node was asked to run, not one imported by another script or a test.
 *
 * Both sides are compared as real paths: node resolves symbolic links in `import.meta.url` but keeps
 * `process.argv[1]` as given, so a script reached through a link (a temporary or cache folder behind one, a project
 * opened through one) never matched and exited silently with 0 — a gate that checks nothing. A hand-built
 * `"file://" + argv[1]` fails the same way on Windows; `realpathSync.native` also settles the drive letter's case
 * there. `process.argv[1]` is absent under `node -e "import(...)"`, and a path that does not resolve (a script
 * started without its extension) is not this module.
 */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** `moduleUrl` is the caller's `import.meta.url`; `scriptPath` the path node was started with. */
export function isEntryPoint(moduleUrl, scriptPath = process.argv[1]) {
  if (!scriptPath) return false;
  try {
    return realpathSync.native(fileURLToPath(moduleUrl)) === realpathSync.native(scriptPath);
  } catch {
    return false; // a path that does not resolve names no module on disk, so not this one
  }
}
