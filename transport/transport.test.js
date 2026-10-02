import { expect, test } from "bun:test";
import { Duration, Effect } from "effect";
import * as Sdk from "./src/herdr-transport.ts";
import { socketFixture } from "./socket-fixture.ts";

for (const operation of ["request", "openStream"]) {
  test(`${operation} enforces its deadline inside an uninterruptible cleanup region`, async () => {
    const fixture = await socketFixture();
    fixture.override(operation === "request" ? "workspace.close" : "events.subscribe", () => {});
    let guard;
    try {
      const pending = Effect.runPromise(
        Effect.gen(function* () {
          const sdk = yield* Sdk.HerdrTransport;
          const options = { requestTimeout: Duration.millis(50) };
          return operation === "request"
            ? yield* sdk.request("workspace.close", { workspaceId: "w1" }, options)
            : yield* sdk.openStream("events.subscribe", { subscriptions: [] }, options);
        }).pipe(
          Effect.scoped,
          Effect.uninterruptible,
          Effect.provide(Sdk.herdrTransportLayer(fixture.socketPath)),
          Effect.result,
        ),
      );
      const result = await Promise.race([
        pending,
        new Promise((_resolve, reject) => {
          guard = setTimeout(() => reject(new Error("Native deadline was masked")), 1000);
        }),
      ]);
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") expect(result.failure._tag).toBe("HerdrRequestTimeout");
      await fixture.idle();
    } finally {
      clearTimeout(guard);
      await fixture.close();
    }
  });
}

// JavaScript callers can bypass TypeScript's generated parameter contracts.
for (const operation of ["request", "openStream"]) {
  test(`${operation} returns a typed failure for malformed runtime parameters`, async () => {
    const fixture = await socketFixture();
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const sdk = yield* Sdk.HerdrTransport;
          return operation === "request"
            ? yield* sdk.request("workspace.create", { cwd: Symbol("invalid runtime input") })
            : yield* sdk.openStream("events.subscribe", {
                subscriptions: Symbol("invalid runtime input"),
              });
        }).pipe(
          Effect.scoped,
          Effect.provide(Sdk.herdrTransportLayer(fixture.socketPath)),
          Effect.result,
        ),
      );
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") expect(result.failure._tag).toBe("HerdrInvalidInput");
      expect(fixture.requests.every((request) => request.method === "ping")).toBe(true);
      await fixture.idle();
    } finally {
      await fixture.close();
    }
  });
}
