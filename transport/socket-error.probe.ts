import { channel, type ChannelListener } from "node:diagnostics_channel";
import { Socket } from "node:net";
import { Effect, Schema, Stream } from "effect";
import * as Sdk from "./src/herdr-transport.ts";
import { socketFixture } from "./socket-fixture.ts";

// Node supplies a deterministic socket diagnostic hook that Bun does not publish.
// Run in a child process so detecting an escaped exception cannot mask a test-runner error.
const Client = Schema.Struct({ socket: Schema.instanceOf(Socket) });
const clients: Socket[] = [];
const capture: ChannelListener = (message) =>
  clients.push(Schema.decodeUnknownSync(Client)(message).socket);
const diagnostics = channel("net.client.socket");
diagnostics.subscribe(capture);
let escaped = false;
process.once("uncaughtException", () => {
  escaped = true;
});
const fixture = await socketFixture();
try {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const sdk = yield* Sdk.HerdrTransport;
      const connection = yield* sdk.openStream("events.subscribe", { subscriptions: [] });
      const socket = clients.at(-1);
      if (!socket) throw new Error("Node socket diagnostic was not published");
      // Fault injection at the real I/O boundary, after handshake and before stream consumption.
      socket.destroy(new Error("synthetic peer reset"));
      yield* Effect.promise(() => new Promise<void>((resolve) => setImmediate(resolve)));
      yield* Sdk.readEvents(connection).pipe(Stream.runDrain);
    }).pipe(
      Effect.scoped,
      Effect.provide(Sdk.herdrTransportLayer(fixture.socketPath)),
      Effect.timeout("500 millis"),
      Effect.result,
    ),
  );
  const contained =
    !escaped && result._tag === "Failure" && result.failure._tag === "HerdrTransportError";
  console.log(contained ? "socket-error-contained" : "socket-error-escaped");
  process.exitCode = contained ? 0 : 1;
} finally {
  diagnostics.unsubscribe(capture);
  await fixture.close();
}
