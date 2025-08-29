const config = require('../../config.json');

const express = require('express');
const app = express.Router();

const { Matchmaking, Servers, User } = require('../../models/mongoose');
const functions = require('../functions/misc');

const buildIds = {};
const playlists = {};
const keys = {};

app.get('/fortnite/api/matchmaking/session/findPlayer/{*any}', requireAuth, (req, res) => {
    res.status(200).end();
});

app.get('/fortnite/api/game/v2/matchmakingservice/ticket/player/{*any}', requireAuth, async (req, res) => {
    if (req.user?.userId?.includes("host-")) return res.status(403).end();

    const rawPlaylist = req.query.bucketId?.split(":")[3];
    const playlist = functions.playlistNames(rawPlaylist)?.toLowerCase();

    buildIds[req.user.userId] = req.query.bucketId?.split(":")?.[0];
    playlists[req.user.userId] = playlist;

    const key = req.query?.['player.option.customKey'];
    if (key) {
        keys[req.user.userId] = key;
    } else {
        delete keys[req.user.userId];
    }

    res.json({
        "serviceUrl": `ws://${config.backend.matchmaking.address}:${config.backend.matchmaking.port}`,
        "ticketType": "mms-player",
        "payload": functions.generateId().replace(/-/ig, ""),
        "signature": "account"
    });
});

app.get('/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId', requireAuth, (req, res) => {
    res.json({
        "accountId": req.params.accountId,
        "sessionId": req.params.sessionId,
        "key": "none"
    });
});

app.get('/fortnite/api/matchmaking/session/:sessionId', requireAuth, async (req, res) => {
    const key = keys?.[req.user.userId] || global.keys?.[req.user.userId];
    const customKeys = await Matchmaking.findOne({ key });

    if (!keys && key) {
        return res.status(404).json({ errorMessage: "The game you are trying to join cannot be found", errorCode: "" });
    }

    const user = await User.findOne({ userId: req.user.userId });
    const server = await Servers.findOne({ userId: user.hosterId });

    res.json({
        "id": req.params.sessionId,
        "ownerId": functions.generateId().replace(/-/ig, "").toUpperCase(),
        "ownerName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverAddress": customKeys?.address || server?.address || config.backend.gameserver.address,
        "serverPort": customKeys?.port || server?.port || config.backend.gameserver.port,
        "maxPublicPlayers": 220,
        "openPublicPlayers": 175,
        "maxPrivatePlayers": 0,
        "openPrivatePlayers": 0,
        "attributes": {
            "REGION_s": "EU",
            "GAMEMODE_s": "FORTATHENA",
            "ALLOWBROADCASTING_b": true,
            "SUBREGION_s": "GB",
            "DCID_s": "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
            "tenant_s": "Fortnite",
            "MATCHMAKINGPOOL_s": "Any",
            "STORMSHIELDDEFENSETYPE_i": 0,
            "HOTFIXVERSION_i": 0,
            "PLAYLISTNAME_s": playlists[req.user.userId],
            "SESSIONKEY_s": functions.generateId().replace(/-/ig, "").toUpperCase(),
            "TENANT_s": "Fortnite",
            "BEACONPORT_i": 15009
        },
        "publicPlayers": [],
        "privatePlayers": [],
        "totalPlayers": 45,
        "allowJoinInProgress": false,
        "shouldAdvertise": false,
        "isDedicated": false,
        "usesStats": false,
        "allowInvites": false,
        "usesPresence": false,
        "allowJoinViaPresence": true,
        "allowJoinViaPresenceFriendsOnly": false,
        "buildUniqueId": buildIds[req.user.userId] || "0",
        "lastUpdated": new Date().toISOString(),
        "started": false
    });
});

app.post('/fortnite/api/matchmaking/session/{*any}/join', requireAuth, (req, res) => {
    res.status(204).end();
});

app.post('/fortnite/api/matchmaking/session/matchMakingRequest', requireAuth, (req, res) => {
    res.json([]);
});

module.exports = app;