import { Effect, Result, Stream } from "effect";
import type { HerdrTransportStream } from "./herdr-transport.ts";
import * as Lines from "./herdr-socket-lines.ts";
import { HerdrInvalidResponse, HerdrTransportError } from "./herdr-errors.ts";
import { parseHerdrWireEvent } from "./herdr-wire-parser.ts";

// Bounded framing and remainder handling are shared with the fork's response reader.
export function readEvents(connection: HerdrTransportStream<"events.subscribe">) {
  const events = connection.readBytes.pipe(
    Stream.mapAccumArrayEffect(Lines.makeHerdrSocketLineBuffer, (buffer, chunks) =>
      Effect.gen(function* () {
        const split = Lines.splitHerdrSocketLines(
          buffer,
          chunks,
          1024 * 1024,
          connection.requestId,
        );
        if (Result.isFailure(split)) return yield* split.failure;
        const decoded = yield* Effect.forEach(
          split.success.lines.filter((line) => line.length > 0),
          (line) =>
            Effect.try({
              try: () =>
                parseHerdrWireEvent(
                  JSON.parse(Buffer.from(line).toString("utf8")),
                  connection.requestId,
                ),
              catch: () =>
                new HerdrInvalidResponse("schema_mismatch", connection.requestId, undefined),
            }),
        );
        return [split.success.buffer, decoded] as const;
      }),
    ),
  );
  // A live-only feed ending is loss of observation, not successful completion.
  return Stream.concat(
    events,
    Stream.fail(
      new HerdrTransportError(
        "event_subscription",
        "premature_close",
        connection.requestId,
        undefined,
      ),
    ),
  );
}
