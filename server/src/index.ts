import { createServer } from "https";
import { readFileSync } from "fs";
import path from "path";
import { WebSocketServer } from "ws";

const PORT = 9001;

const server = createServer({
  cert: readFileSync(path.join(__dirname, "../.ssh/localhost.pem")),
  key: readFileSync(path.join(__dirname, "../.ssh/localhost-key.pem")),
});
const wss = new WebSocketServer({ server });

wss.on("connection", function connection(ws) {
  ws.on("message", function message(data) {
    console.log("received: %s", data);
  });

  ws.send("something");
});

console.log("Server listening on :%s", 8080);
server.listen(8080);
