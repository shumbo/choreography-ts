import { Choreography, Located, Projector } from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

const serverLocations = ["primary", "backup"] as const;
type ServerLocations = (typeof serverLocations)[number];

const locations = ["client", ...serverLocations] as const;
type Locations = (typeof locations)[number];

type Request =
  | {
      type: "GET";
      key: string;
    }
  | {
      type: "PUT";
      key: string;
      value: string;
    };

type Response = string | null;

type State = Map<string, string>;

function handleRequest(request: Request, state: State): Response {
  switch (request.type) {
    case "GET":
      return state.get(request.key) ?? "";
    case "PUT":
      state.set(request.key, request.value);
      return "OK";
  }
}

/**
 * S is a list of states at involved locations
 */
type ReplicationStrategy<S extends Located<State, ServerLocations>[]> =
  Choreography<
    ServerLocations,
    [Located<Request, "primary">, ...S],
    [Located<Response, "primary">]
  >;

export const nullReplicationStrategy: ReplicationStrategy<
  [Located<State, "primary">]
> = async ({ locally }, [requestAtPrimary, primaryState]) => {
  const responseAtPrimary = await locally("primary", (unwrap) =>
    handleRequest(unwrap(requestAtPrimary), unwrap(primaryState))
  );
  return [responseAtPrimary];
};

export const primaryBackupReplicationStrategy: ReplicationStrategy<
  [Located<State, "primary">, Located<State, "backup">]
> = async (
  { multicast, locally, colocally },
  [requestAtPrimary, primaryState, backupState]
) => {
  // primary checks if the request is mutating
  const isPutAtPrimary = await locally(
    "primary",
    (unwrap) => unwrap(requestAtPrimary).type === "PUT"
  );
  // multicast the boolean to branch
  const isPut = await multicast("primary", ["backup"], isPutAtPrimary);
  // forward request to backup if mutating
  await colocally(
    ["primary", "backup"],
    async ({ locally, comm, peel }) => {
      if (peel(isPut)) {
        const requestAtBackup = await comm(
          "primary",
          "backup",
          requestAtPrimary
        );
        await locally("backup", (unwrap) => {
          console.log("backup request", unwrap(requestAtBackup));
          handleRequest(unwrap(requestAtBackup), unwrap(backupState));
        });
      }
      return [];
    },
    []
  );
  const responseAtPrimary = await locally("primary", (unwrap) =>
    handleRequest(unwrap(requestAtPrimary), unwrap(primaryState))
  );
  return [responseAtPrimary];
};

export function kvs<S extends Located<State, ServerLocations>[]>(
  replicationStrategy: ReplicationStrategy<S>
) {
  const kvs_: Choreography<
    Locations,
    [Located<Request, "client">, ...S],
    [Located<Response, "client">]
  > = async ({ comm, colocally }, [requestAtClient, ...states]) => {
    const requestAtPrimary = await comm("client", "primary", requestAtClient);
    const [responseAtPrimary] = await colocally(
      ["primary", "backup"],
      replicationStrategy,
      [requestAtPrimary, ...states]
    );
    const responseAtClient = await comm("primary", "client", responseAtPrimary);
    return [responseAtClient];
  };
  return kvs_;
}

async function main() {
  const config: HttpConfig<Locations> = {
    client: ["localhost", 3000],
    primary: ["localhost", 3001],
    backup: ["localhost", 3002],
  };
  const [clientTransport, primaryTransport, backupTransport] =
    await Promise.all([
      ExpressTransport.create(config, "client"),
      ExpressTransport.create(config, "primary"),
      ExpressTransport.create(config, "backup"),
    ]);
  const clientProjector = new Projector(clientTransport, "client");
  const primaryProjector = new Projector(primaryTransport, "primary");
  const backupProjector = new Projector(backupTransport, "backup");

  const primaryState: State = new Map<string, string>();
  const backupState: State = new Map<string, string>();

  const client = clientProjector.epp(kvs(primaryBackupReplicationStrategy));
  const primary = primaryProjector.epp(kvs(primaryBackupReplicationStrategy));
  const backup = backupProjector.epp(kvs(primaryBackupReplicationStrategy));

  await Promise.all([
    client([
      { type: "PUT", key: "hello", value: "world" },
      undefined,
      undefined,
    ]),
    primary([undefined, primaryState, undefined]),
    backup([undefined, undefined, backupState]),
  ]);
  const [[response], _] = await Promise.all([
    client([{ type: "GET", key: "hello" }, undefined, undefined]),
    primary([undefined, primaryState, undefined]),
    backup([undefined, undefined, backupState]),
  ]);
  console.log({ response });
  await Promise.all([
    clientProjector.transport.teardown(),
    primaryProjector.transport.teardown(),
    backupProjector.transport.teardown(),
  ]);
}

if (require.main === module) {
  main();
}
