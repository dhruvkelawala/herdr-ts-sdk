import { Effect } from "effect";
import { HerdrTransport, herdrTransportLayer, readEvents } from "@sumostudio/herdr-sdk";
import type { HerdrWireParameters } from "@sumostudio/herdr-sdk";
import { socketFixture } from "./socket-fixture.ts";

// @ts-expect-error The published surface is bounded to the transport.
import type { HerdrSdk } from "@sumostudio/herdr-sdk";
export type UnsupportedNamespace = HerdrSdk;
const parameters: HerdrWireParameters<"ping"> = {};
// @ts-expect-error Generated protocol contracts preserve caller dictionary value types.
const badEnvironment: HerdrWireParameters<"workspace.create"> = { env: { PATH: 1 } };
void badEnvironment;
void readEvents;

const fixture = await socketFixture();
try {
  const ping = Effect.gen(function* () {
    const transport = yield* HerdrTransport;
    const { result } = yield* transport.request("ping", parameters);
    return { version: result.version, protocol: result.protocol };
  }).pipe(Effect.provide(herdrTransportLayer(fixture.socketPath)));
  const supported = await Effect.runPromise(ping);
  if (supported.protocol !== 20 || supported.version !== "0.8.2") throw new Error("wrong pong");
  fixture.changeProtocol(21);
  const rejected = await Effect.runPromise(ping.pipe(Effect.result));
  if (rejected._tag !== "Failure" || rejected.failure._tag !== "HerdrUnsupportedProtocol") {
    throw new Error("incompatible protocol was accepted");
  }
  if (fixture.requests.some((request) => request.method !== "ping")) throw new Error("mutation");
  await fixture.idle();
  console.log(JSON.stringify({ supported, incompatibleProtocolRejected: true, readOnly: true }));
} finally {
  await fixture.close();
}
