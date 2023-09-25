import { createServer as createHttpServer } from "node:http";
import { setupServer } from "@choreography-ts/transport-socketio/server";
import { fileURLToPath } from "url";
import { createServer } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const viteServer = await createServer({
  // any valid user config options, plus `mode` and `configFile`
  configFile: false,
  root: __dirname,
  server: {
    port: 1337,
  },
});
await viteServer.listen();

viteServer.printUrls();

const server = createHttpServer();
setupServer(server);
server.listen(3400);
