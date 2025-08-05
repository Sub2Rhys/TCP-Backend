const config = require('../../config.json');

const functions = require('../functions/misc');

const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket XMPP Server Running\n');
});

const wss = new WebSocket.Server({ server });

// thanks lawin 😝
wss.on('connection', async (ws, req) => {
    if (ws.protocol.toLowerCase() != "xmpp") {
        const ticketId = functions.generateId().replace(/-/ig, "");
        const matchId = functions.generateId().replace(/-/ig, "");
        const sessionId = functions.generateId().replace(/-/ig, "");

        connecting();
        await functions.sleep(800);
        waiting();
        await functions.sleep(1000);
        queued();
        await functions.sleep(4000);
        sessionAssignment();
        await functions.sleep(2000);
        join();
        await functions.sleep(2500);
        closeSocket();

        function connecting() {
            ws.send(JSON.stringify({
                "payload": {
                    "state": "Connecting"
                },
                "name": "StatusUpdate"
            }));
        }

        function waiting() {
            ws.send(JSON.stringify({
                "payload": {
                    "totalPlayers": 1,
                    "connectedPlayers": 1,
                    "state": "Waiting"
                },
                "name": "StatusUpdate"
            }));
        }

        function queued() {
            ws.send(JSON.stringify({
                "payload": {
                    "ticketId": ticketId,
                    "queuedPlayers": 0,
                    "estimatedWaitSec": 0,
                    "status": {},
                    "state": "Queued"
                },
                "name": "StatusUpdate"
            }));
        }

        function sessionAssignment() {
            ws.send(JSON.stringify({
                "payload": {
                    "matchId": matchId,
                    "state": "SessionAssignment"
                },
                "name": "StatusUpdate"
            }));
        }

        function join() {
            ws.send(JSON.stringify({
                "payload": {
                    "matchId": matchId,
                    "sessionId": sessionId,
                    "joinDelaySec": 1
                },
                "name": "Play"
            }));
        }
        
        function closeSocket() {
            ws.terminate();
        }
    };
});

const port = config.backend.xmpp.port || 80;
server.listen(port, () => {
    console.log(`XMPP listening on port ${port}`);
});

