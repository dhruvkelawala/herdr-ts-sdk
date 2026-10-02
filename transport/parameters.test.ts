import { expect, test } from "bun:test";
import { Effect } from "effect";
import * as Sdk from "./src/herdr-transport.ts";
import { socketFixture } from "./socket-fixture.ts";

type Environment = NonNullable<Sdk.HerdrWireParameters<"workspace.create">["env"]>;
// @ts-expect-error Native map values remain strings after field-name conversion.
const invalidEnvironment: Environment = { PATH: 1 };
void invalidEnvironment;

test("native dictionary keys are caller data, not camel-case protocol fields", async () => {
  const fixture = await socketFixture();
  try {
    await Effect.runPromise(
      Effect.gen(function* () {
        const sdk = yield* Sdk.HerdrTransport;
        yield* sdk.request("workspace.create", { env: { PATH: "/usr/bin", mixedCase: "kept" } });
        yield* sdk.request("pane.report_metadata", {
          source: "fixture",
          paneId: "w1:p1",
          tokens: { runId: "fixture", removed: null },
          stateLabels: { myLabel: "kept" },
        });
      }).pipe(Effect.provide(Sdk.herdrTransportLayer(fixture.socketPath))),
    );
    expect(
      fixture.requests.find((request) => request.method === "workspace.create")?.params,
    ).toEqual({ env: { PATH: "/usr/bin", mixedCase: "kept" } });
    expect(
      fixture.requests.find((request) => request.method === "pane.report_metadata")?.params,
    ).toEqual({
      source: "fixture",
      pane_id: "w1:p1",
      tokens: { runId: "fixture", removed: null },
      state_labels: { myLabel: "kept" },
    });
    await fixture.idle();
  } finally {
    await fixture.close();
  }
});
