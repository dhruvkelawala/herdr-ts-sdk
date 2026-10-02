import { expect, test } from "bun:test";
import { Effect } from "effect";
import { HerdrTransport, herdrTransportLayer } from "@sumostudio/herdr-sdk";
import { socketFixture } from "../transport/socket-fixture.ts";

test("the built package reads ping and rejects a changed protocol at the same socket", async () => {
  const fixture = await socketFixture();
  try {
    const ping = Effect.gen(function* () {
      const transport = yield* HerdrTransport;
      return yield* transport.request("ping", {});
    }).pipe(Effect.provide(herdrTransportLayer(fixture.socketPath)));
    expect((await Effect.runPromise(ping)).result).toEqual({
      type: "pong",
      version: "0.8.2",
      protocol: 20,
    });
    fixture.changeProtocol(22);
    const rejected = await Effect.runPromise(ping.pipe(Effect.result));
    expect(rejected._tag).toBe("Failure");
    if (rejected._tag === "Failure") {
      expect(rejected.failure._tag).toBe("HerdrUnsupportedProtocol");
      if (rejected.failure._tag === "HerdrUnsupportedProtocol") {
        expect(rejected.failure.actualProtocol).toBe(22);
        expect(rejected.failure.supportedProtocol).toBe(20);
      }
    }
    expect(fixture.requests.map((request) => request.method)).toEqual(["ping", "ping"]);
    expect(fixture.workspaceExists()).toBe(false);
    await fixture.idle();
  } finally {
    await fixture.close();
  }
});
