import { App } from "./app";
import { Server } from "./server";

const app = new App();
const server = new Server();

async function main() {
    await app.start();
    await server.start();
}

main();
