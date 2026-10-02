# Provenance

Unofficial bounded transport fork of
[`dmmulroy/herdr-ts-sdk`](https://github.com/dmmulroy/herdr-ts-sdk), SDK tag
`v0.8.2`, commit `2e70f2638c53c5b0d2335f0641a479a0f42fd578`.
Copyright (c) 2026 Dillon Mulroy and the complete MIT licence remain in `LICENSE`.
Upstream Git history and source are retained. No upstream endorsement is implied.
Fork repository: <https://github.com/dhruvkelawala/herdr-ts-sdk>.

## Released code

`transport/` copies SumoStudio's `packages/herdr-sdk` at public commit
[`7b5e98965a683d5e2f9c67d2de2eae071bd5430e`](https://github.com/dhruvkelawala/sumostudio/tree/7b5e98965a683d5e2f9c67d2de2eae071bd5430e/packages/herdr-sdk).
The local extraction at `e969369ff33aeec4a8ae3f8a3e5c21d454c1e386` had identical
SDK files. The npm package exports this transport
only. Upstream `src/`, `schema/`, and Vite+ setup remain historical reference
material and are excluded from the release build and tarball. Namespace services,
graphics wrappers, native agent integrations and the upstream `HerdrSdk`
aggregate are not exported or supported.

SumoStudio extraction changes:

- Exact Effect and `@effect/platform-node` `4.0.0-rc.112`, Bun `1.4.0`, `node:net`.
- Herdr `0.8.2` protocol 20 schema and generated method/result contracts.
- Explicit socket selection without ambient fallback; compatibility ping on
  every operation, including `ping`, rejects a server restart with a new protocol.
- Errors discard native messages, payloads, paths and causes. Successful native
  payloads still require the caller's secret filtering before shared use.
- Wire-name conversion preserves caller dictionary keys in `env`, `tokens`, and
  `state_labels`.
- Scoped sockets, bounded framing, typed event decoding and socket faults
  contained between connection, handshake and delayed stream consumption.
- Effect Schema codecs backed by native-contract Ajv validators.

Standalone changes add JavaScript/declaration emission, an explicit package
allowlist, local fixtures, inference/runtime/package checks and release recipes.
Runtime dependencies are not bundled. The transport imports the same `NodeStream`
implementation directly from exact `@effect/platform-node-shared/NodeStream`,
avoiding `@effect/platform-node`'s moving transitive range and unrelated adapters.
The public transport API is unchanged. Real Node is explicit because `bunx --bun`
injects a Node-named Bun shim into PATH.

## Executable identity

The original SumoStudio proof recorded Darwin arm64 Herdr `0.8.2` SHA-256
`3e0f0c2d5edc41f592963ef90f5d872db801cc7dbd0e01731023897ee428904a`.
The official upstream `v0.8.2` release asset inspected on 2026-10-02 has SHA-256
`a5d4f4d504d8b309c91f811050559300faba31258425f53c50852fc96f6ae574`.
These differ. This candidate does not change SumoStudio's pin or equate the two
proofs. Record the live smoke against the official artifact separately before
release. The historic pin investigation remains an integration prerequisite.
The official artifact's `api schema --json` compares exactly equal to the original
committed protocol-20 capture after parsing, despite different formatting.
This distribution adds an attribution `$comment` only; its native contract
schemas remain unchanged. Generated declarations carry SumoStudio generation and
Apache-2.0 notices.
Candidate live read-only smoke uses the official artifact separately from the
historic proof. Its checksum matches upstream release metadata.

## Upstream sync

Keep exact upstream commit and local patch history. Review new tags on an
isolated branch. Evaluate SDK tag, Herdr version/protocol, and Effect version
together. Do not merge upstream services into the bounded transport release
automatically. Regenerate only from a deliberately selected, recorded schema.
Run all release checks and live smoke before a compatibility change, then publish
a new independent SumoStudio version.
