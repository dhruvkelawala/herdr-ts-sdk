import { Effect } from "effect";
import { HerdrTransport, herdrTransportLayer } from "@sumostudio/herdr-sdk";

const socketPath = process.argv[2];
if (!socketPath || process.argv.length !== 3) {
  console.error("Provide one explicit Herdr socket path.");
  process.exit(2);
}

const ping = Effect.gen(function* () {
  const transport = yield* HerdrTransport;
  const { result } = yield* transport.request("ping", {});
  return { version: result.version, protocol: result.protocol };
}).pipe(Effect.provide(herdrTransportLayer(socketPath)), Effect.result);

const result = await Effect.runPromise(ping);
if (result._tag === "Success") {
  console.log(JSON.stringify({ readOnly: true, ...result.success }));
} else {
  const error = result.failure;
  console.error(
    JSON.stringify({
      readOnly: true,
      error: error._tag,
      ...(error._tag === "HerdrUnsupportedProtocol"
        ? { actualProtocol: error.actualProtocol, supportedProtocol: error.supportedProtocol }
        : {}),
    }),
  );
  process.exitCode = 1;
}
