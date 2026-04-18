import { startApiServer } from "./api/server.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

startApiServer(PORT);