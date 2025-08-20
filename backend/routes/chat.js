const express = require('express');
const app = express.Router();

const { createChatRoom } = require('../xmpp/openfire/api');
require('../xmpp/openfire/client');

const rooms = {
    globalChatRooms: [
        {
            roomName: "globalchat"
        },
        {
            roomName: "psn"
        }
    ],
    founderChatRooms: [],
};

(async () => {
    try {
        await Promise.all(
            Object.values(rooms).flat().map(({ roomName }) =>
                createChatRoom({
                    roomName,
                    naturalName: roomName.toLowerCase(),
                    description: roomName.toLowerCase(),
                    canAnyoneDiscoverJID: true,
                    canChangeNickname: true,
                    registrationEnabled: true,
                    logEnabled: true,
                    persistent: true,
                    broadcastPresenceRoles: ["moderator", "participant", "visitor"]
                })
            )
        );
    } catch {}
})();

app.post(['/fortnite/api/game/v2/chat/{*any}/{*any}/{*any}/pc', '/fortnite/api/game/v2/chat/{*any}/{*any}/pc'], (req, res) => {
    const response = {
        ...rooms,
    };

    res.json(response);
});

module.exports = app;