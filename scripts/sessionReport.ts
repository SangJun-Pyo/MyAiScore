import { writeFileSync } from "node:fs";
import { encodeSessionReportFragment, exampleSessionReport } from "../src/shared/sessionReport.js";
import { collectSessionReport, discoverSession, resolveProject, SessionReportError } from "../src/server/sessionReport/collect.js";

function main(args: string[]): number {
  const options: Record<string, string | true> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (["--help", "--json", "--example"].includes(arg)) { options[arg] = true; continue; }
    if (!["--project", "--session", "--out", "--web-url"].includes(arg) || options[arg] !== undefined || !args[i + 1] || args[i + 1]!.startsWith("--")) {
      throw new SessionReportError("invalid_arguments", "Use --help to see supported arguments.");
    }
    options[arg] = args[++i]!;
  }
  if (options["--help"]) {
    console.log("MyAiScore session report\n\nRun from your project directory, or specify --project DIR --session FILE.\n--example         Use an explicitly synthetic example; no local logs are read\n--json            Print only a safe counts-only JSON report\n--out NEW_FILE    Save that same report without overwriting an existing file\n--web-url URL     Print a browser link with the counts-only report in its fragment\n\nLocal Claude Code transcript analysis only. No network requests, AI calls, code execution or automatic upload. Automatic discovery reads only this project's latest transcript, under CLAUDE_CONFIG_DIR or ~/.claude. Scores describe activity mix, not ability. This checkout CLI is not a published npm package.");
    return 0;
  }
  let web: URL | undefined;
  if (typeof options["--web-url"] === "string") {
    try {
      web = new URL(options["--web-url"]);
      if (!["http:", "https:"].includes(web.protocol) || web.username || web.password || web.search || web.hash) throw new Error();
    } catch { throw new SessionReportError("invalid_web_url", "Use an HTTP(S) report page URL without credentials, a query or a fragment."); }
  }
  if (options["--example"] && (options["--project"] || options["--session"])) throw new SessionReportError("invalid_arguments", "Use --example by itself, without --project or --session.");
  const report = options["--example"] ? exampleSessionReport : (() => {
    const project = resolveProject(typeof options["--project"] === "string" ? options["--project"] : process.cwd());
    const session = typeof options["--session"] === "string" ? options["--session"] : discoverSession(project, undefined, process.env.CLAUDE_CONFIG_DIR);
    return collectSessionReport(session, project);
  })();
  const json = JSON.stringify(report, null, 2);
  if (typeof options["--out"] === "string") {
    try { writeFileSync(options["--out"], json + "\n", { flag: "wx", mode: 0o600 }); }
    catch { throw new SessionReportError("output_not_written", "The output could not be created. Choose a new file in an existing directory; existing files are never overwritten."); }
  }
  if (options["--json"]) console.log(json);
  else {
    console.log(`MyAiScore | ${report.style.title}${report.origin === "synthetic" ? " | Synthetic example" : ""}\nSession mix: ${report.score.value ?? "Not available"}${report.score.value === null ? "" : "/100"} | Coverage: ${report.coverage}\n${report.score.explanation}\n`);
    for (const highlight of report.highlights) console.log(`${highlight.title}\n${highlight.description}\n`);
    console.log(`Next challenge: ${report.nextChallenge.title}\n${report.nextChallenge.description}\n\nLocal counts only. No transcript content was uploaded. This is not an ability grade.`);
  }
  if (web) {
    web.hash = encodeSessionReportFragment(report).slice(1);
    // Keep --json stdout machine-readable. The URL carries the same safe summary only.
    console.error(`Open this counts-only report link yourself (nothing was uploaded):\n${web.toString()}`);
  }
  return report.score.value === null ? 1 : 0;
}
try { process.exitCode = main(process.argv.slice(2)); }
catch (error) {
  const known = error instanceof SessionReportError;
  console.error(`${known ? error.code : "session_report_failed"}: ${known ? error.message : "The session report could not be created."}`);
  process.exitCode = 1;
}
