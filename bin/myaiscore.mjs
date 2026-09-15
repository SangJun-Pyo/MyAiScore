#!/usr/bin/env node
// Runtime is this installed checkout's tsx, never downloaded or target-project code.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const entry = fileURLToPath(new URL("../scripts/sessionReport.ts", import.meta.url));
const tsx = import.meta.resolve("tsx");
const result = spawnSync(process.execPath, ["--import", tsx, entry, ...process.argv.slice(2)], { stdio: "inherit", shell: false });
if (result.error) console.error("The local session report runtime could not start. Install this checkout's dependencies first.");
process.exitCode = result.status ?? 1;
