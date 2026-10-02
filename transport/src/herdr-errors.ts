/* oxlint-disable anti-slop/no-unknown-parameters -- Preserve upstream constructor signatures while discarding untrusted causes. */
import { Schema } from "effect";

// Fork errors deliberately retain no native messages, payloads, paths or causes.
// Terminal contents and server diagnostics are not safe shared metadata.
export class HerdrInvalidInput extends Schema.TaggedError<HerdrInvalidInput>()(
  "HerdrInvalidInput",
  { operation: Schema.String },
) {
  constructor(operation: string, _cause: unknown) {
    super({ operation });
  }
}
export class HerdrTransportError extends Schema.TaggedError<HerdrTransportError>()(
  "HerdrTransportError",
  {
    operation: Schema.Literals([
      "request",
      "compatibility_check",
      "event_subscription",
      "graphics_stream",
      "graphics_write",
    ]),
    reason: Schema.Literals(["connect", "read", "write", "premature_close"]),
    requestId: Schema.String,
  },
) {
  constructor(
    operation: HerdrTransportError["operation"],
    reason: HerdrTransportError["reason"],
    requestId: string,
    _cause: unknown,
  ) {
    super({ operation, reason, requestId });
  }
}
export class HerdrRequestTimeout extends Schema.TaggedError<HerdrRequestTimeout>()(
  "HerdrRequestTimeout",
  {
    operation: Schema.String,
    requestId: Schema.String,
    timeoutMilliseconds: Schema.Number,
  },
) {
  constructor(operation: string, requestId: string, timeoutMilliseconds: number) {
    super({ operation, requestId, timeoutMilliseconds });
  }
}
export class HerdrInvalidResponse extends Schema.TaggedError<HerdrInvalidResponse>()(
  "HerdrInvalidResponse",
  {
    reason: Schema.Literals([
      "malformed_json",
      "oversized_frame",
      "correlation_mismatch",
      "schema_mismatch",
      "missing_result",
      "unsupported_value",
    ]),
    requestId: Schema.String,
  },
) {
  constructor(reason: HerdrInvalidResponse["reason"], requestId: string, _cause: unknown) {
    super({ reason, requestId });
  }
}
export class HerdrUnsupportedProtocol extends Schema.TaggedError<HerdrUnsupportedProtocol>()(
  "HerdrUnsupportedProtocol",
  {
    actualProtocol: Schema.Number,
    supportedProtocol: Schema.Literal(20),
    requestId: Schema.String,
  },
) {
  constructor(actualProtocol: number, supportedProtocol: 20, requestId: string) {
    super({ actualProtocol, supportedProtocol, requestId });
  }
}
export class HerdrUnsupportedResult extends Schema.TaggedError<HerdrUnsupportedResult>()(
  "HerdrUnsupportedResult",
  { requestId: Schema.String },
) {
  constructor(_operation: string, _actualType: string, _expectedType: string, requestId: string) {
    super({ requestId });
  }
}
export class HerdrUnsupportedEvent extends Schema.TaggedError<HerdrUnsupportedEvent>()(
  "HerdrUnsupportedEvent",
  { requestId: Schema.String },
) {
  constructor(_eventType: string, requestId: string) {
    super({ requestId });
  }
}
export class HerdrServerError extends Schema.TaggedError<HerdrServerError>()("HerdrServerError", {
  requestId: Schema.String,
}) {
  constructor(_serverCode: string, _serverMessage: string, requestId: string) {
    super({ requestId });
  }
}
