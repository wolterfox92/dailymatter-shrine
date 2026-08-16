#!/usr/bin/env node
// PreToolUse guard for playground-shopify (Shrine Theme Pro).
// Deterministic enforcement of CLAUDE.md golden rules 2 and 12:
//   - blocks `shopify theme publish` and any live push from the CLI
//   - blocks in-place edits of Shrine core files (non `custom-*` in sections/, snippets/, blocks/, assets/)
//   - asks for human confirmation on layout/theme.liquid (CUSTOM-START/END hooks only)
//   - blocks hand-edits of config/settings_data.json
// Reads the PreToolUse JSON event on stdin; answers via hookSpecificOutput on stdout.

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    process.exit(0); // unparsable input: fall through to the normal permission flow
  }

  const tool = input.tool_name || "";
  const ti = input.tool_input || {};

  const decide = (permissionDecision, permissionDecisionReason) => {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision,
          permissionDecisionReason,
        },
      })
    );
    process.exit(0);
  };

  if (tool === "Bash") {
    const cmd = String(ti.command || "");
    if (/shopify\s+theme\s+publish\b/.test(cmd)) {
      decide(
        "deny",
        "Golden rule 12: never `shopify theme publish` from CLI. Publish-swap happens from the Shopify admin only."
      );
    }
    if (/shopify\s+theme\s+push\b/.test(cmd) && /(^|\s)(--live|-l)(\s|=|$)/.test(cmd)) {
      decide(
        "deny",
        "Golden rule 12: never push to the live theme. Push to a fresh unpublished QA theme instead (`shopify theme push --unpublished`)."
      );
    }
    process.exit(0);
  }

  if (tool === "Edit" || tool === "Write" || tool === "MultiEdit") {
    const raw = String(ti.file_path || "");
    if (!raw) process.exit(0);

    // Normalise to a project-relative path with forward slashes.
    const projectDir = (process.env.CLAUDE_PROJECT_DIR || "").replace(/\\/g, "/").replace(/\/+$/, "");
    let p = raw.replace(/\\/g, "/");
    if (projectDir && p.startsWith(projectDir + "/")) p = p.slice(projectDir.length + 1);
    p = p.replace(/^\.\//, "").replace(/^\/+/, "");

    const core = p.match(/^(sections|snippets|blocks|assets)\/([^/]+)$/);
    if (core && !core[2].startsWith("custom-")) {
      decide(
        "deny",
        `Golden rule 2: ${p} is a Shrine core file and is never edited in place. Create a custom- prefixed copy or use an extension point (see the task router in CLAUDE.md).`
      );
    }
    if (p === "layout/theme.liquid") {
      decide(
        "ask",
        "layout/theme.liquid is a Shrine core file. Only bracketed CUSTOM-START/END hook blocks are sanctioned, each with a docs/changes.md entry. Approve only if this edit is such a hook."
      );
    }
    if (/^layout\//.test(p)) {
      decide("deny", `Golden rule 2: ${p} is a Shrine core layout file and has no sanctioned edits.`);
    }
    if (p === "config/settings_data.json") {
      decide(
        "deny",
        "config/settings_data.json is live merchant state and is never hand-edited (see Commands & environment in CLAUDE.md)."
      );
    }
    process.exit(0);
  }

  process.exit(0);
});
