/* oxlint-disable anti-slop/no-unknown-parameters -- This is the native JSON trust boundary, decoded through Effect Schema. */
import { Ajv2020 } from "ajv/dist/2020.js";
import { Schema } from "effect";
import herdrApiSchema from "../schema/herdr-api.schema.json" with { type: "json" };
import type { ErrorResponse } from "./generated/wire-error-response.ts";
import type { EventEnvelope } from "./generated/wire-event.ts";
import type { SubscriptionEventEnvelope } from "./generated/wire-subscription-event.ts";
import type { SuccessResponse } from "./generated/wire-success-response.ts";

const SCHEMA_ID = "https://herdr.dev/herdr-api.schema.json";
const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
ajv.addSchema({ ...herdrApiSchema, $id: SCHEMA_ID });

// Herdr owns this external contract. Declare its generated validators as Effect
// codecs rather than hand-maintaining a second, potentially weaker wire schema.
const Success = Schema.declare<SuccessResponse>(
  ajv.compile<SuccessResponse>({
    $ref: `${SCHEMA_ID}#/schemas/success_response`,
  }),
);
const Failure = Schema.declare<ErrorResponse>(
  ajv.compile<ErrorResponse>({
    $ref: `${SCHEMA_ID}#/schemas/error_response`,
  }),
);
const Lifecycle = Schema.declare<EventEnvelope>(
  ajv.compile<EventEnvelope>({
    $ref: `${SCHEMA_ID}#/schemas/event`,
  }),
);
const Subscription = Schema.declare<SubscriptionEventEnvelope>(
  ajv.compile<SubscriptionEventEnvelope>({
    $ref: `${SCHEMA_ID}#/schemas/subscription_event`,
  }),
);

const decodeResponse = Schema.decodeUnknownSync(Schema.Union([Success, Failure]));
const decodeEvent = Schema.decodeUnknownSync(Schema.Union([Lifecycle, Subscription]));

/** Called only inside the transport's Effect.try, which strips parser causes. */
export function parseHerdrWireResponse(
  value: unknown,
  _requestId: string,
): SuccessResponse | ErrorResponse {
  return decodeResponse(value);
}

/** Called only inside the event stream's Effect.try, which strips parser causes. */
export function parseHerdrWireEvent(
  value: unknown,
  _requestId: string,
): EventEnvelope | SubscriptionEventEnvelope {
  return decodeEvent(value);
}
