import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseFingerprint } from "./release-fingerprint.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const release = join(root, ".release");
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert.equal(Bun.version, "1.4.0", "Use the pinned Bun release toolchain");
const node = process.env.HERDR_SDK_NODE;
assert(
  node,
  "Set HERDR_SDK_NODE to the real Node executable; bunx may inject a Node-named Bun shim",
);

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
  return result.stdout.trim();
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function generatedDigest() {
  const directory = join(root, "transport/src/generated");
  const names = (await readdir(directory)).filter((name) => name.endsWith(".ts")).sort();
  return sha256(
    Buffer.concat(await Promise.all(names.map((name) => readFile(join(directory, name))))),
  );
}

assert.equal(
  run(node, ["--version"]),
  `v${manifest.sumostudioRelease.nodeVersion}`,
  "Use the pinned Node release toolchain",
);
assert.deepEqual(
  JSON.parse(
    run(node, [
      "--eval",
      "console.log(JSON.stringify({name:process.release.name,node:process.versions.node,bun:process.versions.bun??null}))",
    ]),
  ),
  { name: "node", node: manifest.sumostudioRelease.nodeVersion, bun: null },
  "The Node consumer check must use real Node",
);
assert.equal(
  run("npm", ["--version"]),
  manifest.sumostudioRelease.npmVersion,
  "Use the pinned npm pack toolchain",
);

await mkdir(release, { recursive: true });
const originalGenerated = await generatedDigest();
run(process.execPath, ["run", "generate"]);
assert.equal(
  await generatedDigest(),
  originalGenerated,
  "Committed native declarations must match their schema",
);
run(process.execPath, ["run", "build"]);

const packed = JSON.parse(
  run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", release]),
)[0];
const tarball = join(release, packed.filename);
const allowedRoot = new Set([
  "package.json",
  "LICENSE",
  "README.md",
  "PROVENANCE.md",
  "THIRD_PARTY_NOTICES.md",
  "licenses/HERDR-APACHE-2.0.txt",
]);
const sourceNames = (await readdir(join(root, "transport/src"))).filter((name) =>
  name.endsWith(".ts"),
);
const generatedNames = (await readdir(join(root, "transport/src/generated"))).filter((name) =>
  name.endsWith(".ts"),
);
const allowedFiles = new Set([
  ...allowedRoot,
  "dist/schema/herdr-api.schema.json",
  ...sourceNames.flatMap((name) =>
    [name.replace(/\.ts$/, ".js"), name.replace(/\.ts$/, ".d.ts")].map(
      (file) => `dist/src/${file}`,
    ),
  ),
  ...generatedNames.flatMap((name) =>
    [name.replace(/\.ts$/, ".js"), name.replace(/\.ts$/, ".d.ts")].map(
      (file) => `dist/src/generated/${file}`,
    ),
  ),
]);
const actualFiles = packed.files.map((file) => file.path).sort();
assert.deepEqual(
  actualFiles,
  [...allowedFiles].sort(),
  "Tarball must contain exactly the intended transport distribution",
);
assert.deepEqual(
  run("tar", ["-tzf", tarball]).split("\n").sort(),
  actualFiles.map((file) => `package/${file}`).sort(),
);
const requiredLicense = await readFile(join(root, "LICENSE"), "utf8");
assert.match(requiredLicense, /Copyright \(c\) 2026 Dillon Mulroy/);
assert.equal(run("tar", ["-xOf", tarball, "package/LICENSE"]), requiredLicense.trim());

for (const file of actualFiles) {
  const text = run("tar", ["-xOf", tarball, `package/${file}`]);
  assert.doesNotMatch(
    text,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[opusr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,}/,
    `Credential signature in ${file}`,
  );
  assert.doesNotMatch(text, /\/Users\/sumodeus\//, `Private workstation path in ${file}`);
}
const nativeLicense = await readFile(join(root, "licenses/HERDR-APACHE-2.0.txt"));
assert.equal(
  createHash("sha1").update(`blob ${nativeLicense.length}\0`).update(nativeLicense).digest("hex"),
  "261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64",
  "Native license must match the upstream v0.8.2 Git blob",
);
assert.equal(
  run("tar", ["-xOf", tarball, "package/licenses/HERDR-APACHE-2.0.txt"]),
  nativeLicense.toString("utf8").trim(),
);
const nativeSchema = JSON.parse(
  run("tar", ["-xOf", tarball, "package/dist/schema/herdr-api.schema.json"]),
);
assert.match(nativeSchema.$comment, /Apache-2.0.*SumoStudio/);
for (const name of generatedNames) {
  const declaration = run("tar", [
    "-xOf",
    tarball,
    `package/dist/src/generated/${name.replace(/\.ts$/, ".d.ts")}`,
  ]);
  assert.match(declaration, /Generated by SumoStudio.*Apache-2.0/);
}

const packedManifest = JSON.parse(run("tar", ["-xOf", tarball, "package/package.json"]));
assert.equal(packedManifest.name, "@sumostudio/herdr-sdk");
assert.equal(packedManifest.version, "0.8.2-sumostudio.1");
assert.equal(packedManifest.license, "(MIT AND Apache-2.0)");
assert.equal(packedManifest.private, undefined);
assert.equal(packedManifest.bundledDependencies, undefined);
for (const name of ["effect", "@effect/platform-node-shared"]) {
  assert.equal(packedManifest.dependencies[name], "4.0.0-rc.112");
}

const secondPack = await mkdtemp(join(tmpdir(), "herdr-repeat-pack-"));
const repeated = JSON.parse(
  run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", secondPack]),
)[0];
const tarballSha256 = sha256(await readFile(tarball));
assert.equal(
  sha256(await readFile(join(secondPack, repeated.filename))),
  tarballSha256,
  "Repeated packing must produce identical bytes",
);

const consumer = await mkdtemp(join(tmpdir(), "herdr-package-consumer-"));
await writeFile(
  join(consumer, "package.json"),
  JSON.stringify(
    {
      name: "herdr-sdk-clean-consumer",
      private: true,
      type: "module",
      dependencies: { [manifest.name]: `file:${tarball}`, effect: "4.0.0-rc.112" },
      devDependencies: { typescript: "5.9.2", "@types/bun": "1.4.0" },
    },
    null,
    2,
  ),
);
await cp(join(root, "tests/consumer"), consumer, { recursive: true });
await cp(join(root, "transport/socket-fixture.ts"), join(consumer, "socket-fixture.ts"));
await writeFile(
  join(consumer, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        skipLibCheck: true,
        types: ["bun"],
        rewriteRelativeImportExtensions: true,
        outDir: "compiled",
      },
      include: ["*.ts"],
    },
    null,
    2,
  ),
);
run(process.execPath, ["install"], consumer);
run(process.execPath, ["x", "--no-install", "tsc", "--noEmit"], consumer);
run(process.execPath, ["x", "--no-install", "tsc"], consumer);
const installed = JSON.parse(
  await readFile(join(consumer, "node_modules/@sumostudio/herdr-sdk/package.json"), "utf8"),
);
assert.equal(installed.version, manifest.version);
for (const name of ["effect", "@effect/platform-node-shared"]) {
  const dependency = JSON.parse(
    await readFile(join(consumer, "node_modules", name, "package.json"), "utf8"),
  );
  assert.equal(dependency.version, "4.0.0-rc.112", `Clean consumer version of ${name}`);
}
const bunResult = JSON.parse(run(process.execPath, ["compiled/runtime.js"], consumer));
const nodeResult = JSON.parse(run(node, ["compiled/runtime.js"], consumer));
assert.deepEqual(bunResult, nodeResult);
assert.deepEqual(bunResult, {
  supported: { version: "0.8.2", protocol: 20 },
  incompatibleProtocolRejected: true,
  readOnly: true,
});

const record = {
  package: manifest.name,
  version: manifest.version,
  sourceCommit: run("git", ["rev-parse", "HEAD"]),
  sourceFingerprint: await releaseFingerprint(root),
  sourceHasUncommittedChanges: run("git", ["status", "--porcelain"]).length > 0,
  bun: Bun.version,
  node: run(node, ["--version"]),
  nodeExecutable: node,
  npm: run("npm", ["--version"]),
  typescript: run(process.execPath, ["x", "--no-install", "tsc", "--version"]),
  tarball: resolve(tarball),
  tarballSha256,
  packedFiles: actualFiles,
  consumer,
  checks: {
    generatedContracts: true,
    exactAllowlist: true,
    license: true,
    credentialSignatures: true,
    repeatPack: true,
    consumerTypecheck: true,
    consumerBun: bunResult,
    consumerNode: nodeResult,
  },
};
await writeFile(join(release, "verification.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(
  JSON.stringify({
    package: record.package,
    version: record.version,
    tarballSha256,
    files: actualFiles.length,
    bun: record.bun,
    node: record.node,
    consumerTypecheck: true,
    readOnlyRuntime: true,
    sourceHasUncommittedChanges: record.sourceHasUncommittedChanges,
  }),
);
