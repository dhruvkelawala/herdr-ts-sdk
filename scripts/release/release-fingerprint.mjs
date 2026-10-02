import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const rootFiles = [
  "package.json",
  "bun.lock",
  "LICENSE",
  "README.md",
  "PROVENANCE.md",
  "THIRD_PARTY_NOTICES.md",
  ".oxfmtrc.json",
  "oxlint.transport.json",
  "tsconfig.build.json",
  "tsconfig.transport.json",
];

async function filesUnder(root, directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const children = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(root, path) : [path];
    }),
  );
  return children.flat();
}

// Fingerprint release inputs, including validation recipes, rather than mutable build output.
export async function releaseFingerprint(root) {
  const files = [
    ...rootFiles,
    ...(await filesUnder(root, "transport")),
    ...(await filesUnder(root, "licenses")),
    ...(await filesUnder(root, "tests")),
    ...(await filesUnder(root, "scripts/release")),
  ].sort();
  const contents = await Promise.all(files.map((path) => readFile(join(root, path))));
  const digest = createHash("sha256");
  for (const [index, path] of files.entries()) {
    digest.update(path).update("\0").update(contents[index]).update("\0");
  }
  return digest.digest("hex");
}
