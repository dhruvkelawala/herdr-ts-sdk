import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { releaseFingerprint } from "./release-fingerprint.mjs";

const socketPath = process.argv[2];
if (!socketPath || process.argv.length !== 3) throw new Error("Provide one explicit socket path");
const verification = JSON.parse(
  await readFile(new URL("../../.release/verification.json", import.meta.url), "utf8"),
);
const root = fileURLToPath(new URL("../../", import.meta.url));
const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
assert.equal(head.status, 0);
assert.equal(
  head.stdout.trim(),
  verification.sourceCommit,
  "Run verify:package at the current commit before live smoke",
);
assert.equal(
  await releaseFingerprint(root),
  verification.sourceFingerprint,
  "Release inputs changed; rerun verify:package before live smoke",
);
assert.equal(
  createHash("sha256")
    .update(await readFile(verification.tarball))
    .digest("hex"),
  verification.tarballSha256,
  "Verified tarball changed; rerun verify:package",
);
for (const runtime of [process.execPath, verification.nodeExecutable]) {
  const result = spawnSync(
    runtime,
    [join(verification.consumer, "compiled/read-only-smoke.js"), socketPath],
    { encoding: "utf8" },
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  JSON.stringify({
    sourceCommit: verification.sourceCommit,
    sourceFingerprint: verification.sourceFingerprint,
    tarballSha256: verification.tarballSha256,
    verifiedBun: verification.bun,
    verifiedNode: verification.node,
    readOnly: true,
  }),
);
