import { Context, Duration, Layer, Option, Schema } from "effect";

export const HerdrRequestDeadline = Schema.Duration;
export class HerdrConfig extends Context.Service<
  HerdrConfig,
  {
    readonly socketPath: string;
    readonly requestTimeout: Duration.Duration;
    readonly supportedProtocol: 20;
    readonly application: Option.Option<{
      readonly name: string;
      readonly version: Option.Option<string>;
    }>;
  }
>()("@herdr/sdk/HerdrConfig") {}

// No ambient session fallback: callers must select the worker-local socket explicitly.
export const herdrConfigLayer = (socketPath: string) =>
  Layer.succeed(HerdrConfig, {
    socketPath,
    requestTimeout: Duration.seconds(5),
    supportedProtocol: 20,
    application: Option.none(),
  });
