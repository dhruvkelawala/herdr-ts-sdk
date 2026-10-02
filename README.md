# @sumostudio/herdr-sdk

Unofficial Effect-native protocol-20 transport fork of
[Dillon Mulroy's Herdr TypeScript SDK](https://github.com/dmmulroy/herdr-ts-sdk).
The original MIT attribution is preserved in `LICENSE`. The bundled native
Herdr schema and generated declarations retain Apache-2.0 attribution and its
complete license in `licenses/HERDR-APACHE-2.0.txt`. No upstream endorsement
is implied.

Maintained in the [SumoStudio fork](https://github.com/dhruvkelawala/herdr-ts-sdk).

Candidate `0.8.2-sumostudio.1` packages the bounded transport used by SumoStudio.
It exports `HerdrTransport`, its request/stream types,
`herdrTransportLayer(socketPath)` and `readEvents`. The full upstream service API
is excluded. [PROVENANCE.md](PROVENANCE.md) records source commits, local changes
and the Herdr executable hash discrepancy.

This is a local release candidate. Publication is blocked until an authenticated
npm account confirms ownership of the `@sumostudio` scope. No package version is
published and no SumoStudio registry dependency has been integrated yet.

## Compatibility

| Component                                 | Candidate support                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Herdr                                     | Stable `0.8.2`, protocol **20**                                          |
| Effect and `@effect/platform-node-shared` | Exact `4.0.0-rc.112`                                                     |
| Build and fixture tests                   | Bun `1.4.0`                                                              |
| Emitted ESM                               | Node `26.10.0` or Bun `1.4.0`; verification records actual versions      |
| Platforms                                 | Unix sockets; Windows pipe mapping retained, live Windows proof deferred |
| Public API                                | Transport only with generated protocol-20 contracts                      |

Every operation checks the protocol. Protocols 21 and 22 fail explicitly. Events
are live-only; feed termination is typed loss of observation, not replay.

## Read-only use

After publication to a controlled npm scope:

```sh
bun add @sumostudio/herdr-sdk@0.8.2-sumostudio.1 effect@4.0.0-rc.112
```

```ts
import { Effect } from "effect";
import { HerdrTransport, herdrTransportLayer } from "@sumostudio/herdr-sdk";

const socketPath = "/explicit/path/to/herdr-api.sock";
const ping = Effect.gen(function* () {
  const herdr = yield* HerdrTransport;
  const { result } = yield* herdr.request("ping", {});
  return { version: result.version, protocol: result.protocol };
}).pipe(Effect.provide(herdrTransportLayer(socketPath)));

console.log(await Effect.runPromise(ping));
```

Sockets are explicit. Successful native payloads can contain terminal content
and other private data. Callers must filter them before logging to shared product
surfaces. The SDK never authorizes mutations on the caller's behalf.

## Verify locally

Use the exact toolchain in `package.json`. Node runs the real socket-fault probe
and packed ESM checks. Upstream Vite+ tooling is not required.
Release tooling uses Node `26.10.0`, npm `11.19.1`, TypeScript `5.9.2`,
oxfmt `0.66.0` and oxlint `1.81.0`.

```sh
export HERDR_SDK_NODE="/absolute/path/to/real/node"
bunx --bun bun@1.4.0 install --frozen-lockfile
bunx --bun bun@1.4.0 run check
bunx --bun bun@1.4.0 run verify:package
bunx --bun bun@1.4.0 run smoke -- /explicit/path/to/herdr-api.sock
```

Package verification regenerates and compares declarations, builds, packs and
audits the allowlist, then installs the tarball in a clean temporary consumer.
Public imports typecheck; read-only ping and protocol rejection run under Bun and
Node. The candidate and verification record live under ignored `.release/`.
The live smoke imports that installed tarball and prints version/protocol plus
commit, source fingerprint, tarball hash and runtime evidence. It refuses stale
verification after release inputs, HEAD or the tarball change.
It never creates, focuses, renames, closes, or sends text to workspaces/panes.

`HERDR_SDK_NODE` selects the real Node executable for the diagnostic probe and
consumer runtime check. `bunx --bun` can inject a Node-named Bun shim into PATH,
so an ambient `node` command is insufficient proof of Node compatibility.

## Release and rollback

Resolve npm scope ownership, registry authentication, fork URL, executable
identity and live proof before publishing. Local verification is not a published
release. Run checks at the release commit and record tool versions, commit,
tarball SHA-256 and smoke results. Use independent tag
`sumostudio-v0.8.2-sumostudio.1` at that commit.

Publish the verified tarball with dist tag `sumostudio`; read back registry
metadata and the actual published tarball and inspect its hash/contents. Attach
the same verified tag/commit to the GitHub release. Never use upstream scope
`@herdr/sdk`.

Integrate only the exact published version in SumoStudio, rerun its checks and
live integration proof, and retain the embedded fork revision for rollback.
Restore that exact embedded dependency/revision if necessary. Published versions
and release tags are immutable; corrections require a new version. Upstream sync
follows [PROVENANCE.md](PROVENANCE.md).
