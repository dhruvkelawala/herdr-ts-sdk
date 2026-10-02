import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("socket errors between handshake and stream consumption stay inside the SDK", async () => {
  const directory = await mkdtemp(join(tmpdir(), "herdr-error-test-"));
  try {
    // Bundle TS with the pinned Bun so the Node fault-injection probe needs no TS loader.
    const build = await Bun.build({
      entrypoints: [join(import.meta.dir, "socket-error.probe.ts")],
      target: "node",
      outdir: directory,
      naming: "probe.mjs",
    });
    expect(build.success).toBe(true);
    // bunx --bun injects a Node-named Bun shim; the diagnostic hook needs real Node.
    const node = process.env.HERDR_SDK_NODE;
    if (!node) throw new Error("Set HERDR_SDK_NODE to the real Node executable");
    const child = Bun.spawn([node, join(directory, "probe.mjs")], {
      stdout: "pipe",
      stderr: "pipe",
    });
    try {
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ code, stderr, stdout: stdout.trim() }).toEqual({
        code: 0,
        stderr: "",
        stdout: "socket-error-contained",
      });
    } finally {
      child.kill();
      await child.exited;
    }
  } finally {
    await rm(directory, { recursive: true });
  }
}, 10000);
