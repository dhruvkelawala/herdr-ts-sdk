import type { Effect, Scope } from "effect";
import type {
  HerdrTransportRequestError,
  HerdrTransportStream,
  HerdrWireParameters,
  IHerdrTransport,
} from "@sumostudio/herdr-sdk";
// @ts-expect-error The bounded transport distribution does not export upstream namespace services.
import type { HerdrSdk } from "@sumostudio/herdr-sdk";

declare const transport: IHerdrTransport;
const environment: HerdrWireParameters<"workspace.create"> = {
  env: { PATH: "/usr/bin", mixedCase: "caller data" },
};
// @ts-expect-error Native dictionary values remain strings.
const invalidEnvironment: HerdrWireParameters<"workspace.create"> = { env: { PATH: 1 } };
// @ts-expect-error Native token dictionaries accept string or null, not numbers.
const invalidTokens: HerdrWireParameters<"pane.report_metadata"> = { tokens: { count: 1 } };
const subscription: Effect.Effect<
  HerdrTransportStream<"events.subscribe">,
  HerdrTransportRequestError,
  Scope.Scope
> = transport.openStream("events.subscribe", { subscriptions: [] });
// @ts-expect-error A streaming connection retains its scope requirement.
const unscoped: Effect.Effect<
  HerdrTransportStream<"events.subscribe">,
  HerdrTransportRequestError
> = subscription;
// @ts-expect-error Method names are the generated protocol-20 contract.
transport.request("server.arbitrary", {});

const ping = transport.request("ping", {});
type Ping = Effect.Success<typeof ping>;
const protocol: Ping["result"]["protocol"] = 20;
// @ts-expect-error Ping result is correlated to pong, not another method's success type.
const wrongResult: Ping["result"]["type"] = "workspace_created";
void environment;
void invalidEnvironment;
void invalidTokens;
void unscoped;
void protocol;
void wrongResult;
export type UnsupportedNamespace = HerdrSdk;
