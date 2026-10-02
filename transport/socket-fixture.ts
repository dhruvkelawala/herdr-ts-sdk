import { createServer, type Socket } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Schema } from "effect";

const Request = Schema.Struct({
  id: Schema.String,
  method: Schema.String,
  params: Schema.Record(Schema.String, Schema.Json),
});
const workspace = {
  workspace_id: "w1",
  number: 1,
  label: "fixture-secret-value",
  focused: false,
  pane_count: 1,
  tab_count: 1,
  active_tab_id: "w1:t1",
  agent_status: "unknown",
};
const initialPane = {
  pane_id: "w1:p1",
  terminal_id: "terminal-1",
  workspace_id: "w1",
  tab_id: "w1:t1",
  focused: false,
  agent_status: "unknown",
  revision: 0,
};
const tab = {
  tab_id: "w1:t1",
  workspace_id: "w1",
  number: 1,
  label: "fixture",
  focused: false,
  pane_count: 1,
  agent_status: "unknown",
};

export async function socketFixture() {
  const pane = { ...initialPane };
  const directory = await mkdtemp(join(tmpdir(), "tem33-"));
  const socketPath = join(directory, "api.sock");
  const requests: (typeof Request.Type)[] = [];
  const sockets = new Set<Socket>();
  const overrides = new Map<string, (request: typeof Request.Type, socket: Socket) => void>();
  let onIdle = () => {};
  let events: Socket | undefined;
  let exists = false;
  let protocol = 20;
  const reply = (request: typeof Request.Type, socket: Socket) => {
    if (request.method === "ping") return { type: "pong", protocol, version: "0.8.2" };
    if (request.method === "events.subscribe") {
      events = socket;
      return { type: "subscription_started" };
    }
    if (request.method === "workspace.create") {
      exists = true;
      events?.write(
        JSON.stringify({
          event: "workspace_created",
          data: { type: "workspace_created", workspace },
        }) + "\n",
      );
      return { type: "workspace_created", workspace, tab, root_pane: pane };
    }
    if (request.method === "workspace.close") exists = false;
    if (request.method === "session.snapshot")
      return {
        type: "session_snapshot",
        snapshot: {
          version: "0.8.2",
          protocol,
          workspaces: exists ? [workspace] : [],
          panes: exists ? [pane] : [],
          tabs: [],
          layouts: [],
          agents: [],
        },
      };
    return { type: "ok" };
  };
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.once("close", () => {
      sockets.delete(socket);
      if (sockets.size === 0) onIdle();
    });
    socket.on("error", () => {});
    let buffer = "";
    socket.on("data", (bytes) => {
      buffer += bytes.toString();
      if (!buffer.includes("\n")) return;
      const request = Schema.decodeUnknownSync(Schema.fromJsonString(Request))(buffer.trim());
      requests.push(request);
      const override = overrides.get(request.method);
      if (override) override(request, socket);
      else
        socket.write(
          JSON.stringify({ id: request.id, ok: true, result: reply(request, socket) }) + "\n",
        );
      buffer = "";
    });
  });
  await new Promise<void>((resolve) => server.listen(socketPath, resolve));
  return {
    socketPath,
    directory,
    requests,
    changeProtocol: (value: number) => {
      protocol = value;
    },
    workspaceExists: () => exists,
    invalidatePaneId: () => {
      pane.pane_id = "";
    },
    override: (method: string, respond: (request: typeof Request.Type, socket: Socket) => void) => {
      overrides.set(method, respond);
    },
    idle: () =>
      new Promise<void>((resolve) => {
        if (sockets.size === 0) resolve();
        else onIdle = resolve;
      }),
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await rm(directory, { recursive: true });
    },
  };
}
