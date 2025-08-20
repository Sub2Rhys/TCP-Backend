const express = require('express');
const app = express.Router();

const fs = require('node:fs');

app.get(['/fortnite/api/versioncheck{*any}', '/fortnite/api/v2/versioncheck{*any}'], async (req, res) => {
    res.json({
        "type": "NO_UPDATE"
    });
});

app.get(['/waitingroom/api/waitingroom', '/launcher-resources/waitingroom/retryconfig.json', '/launcher-resources/waitingroom/Fortnite/retryconfig.json'], async (req, res) => {
    res.status(204).end();
});

app.post('/datarouter/api/v1/public/{*any}', async (req, res) => {
    const { SessionID, UserID } = req.query;
    const match = UserID.match(/^[^|]+\|([^|]+)/);
    const userId = match ? match[1] : null;

    global.sessions[userId] = SessionID.replace(/[{}-]/g, '');

    res.status(204).end();
});

app.post('/fortnite/api/game/v2/tryPlayOnPlatform/{*any}', async (req, res) => {
    res.send("true");
});

app.get('/lightswitch/api/service/bulk/status', async (req, res) => {
    res.json([{
        "serviceInstanceId": "fortnite",
        "status": "UP",
        "message": "Fortnite is online",
        "maintenanceUri": null,
        "overrideCatalogIds": [
            "a7f138b2e51945ffbfdacc1af0541053"
        ],
        "allowedActions": ["PLAY", "DOWNLOAD"],
        "banned": false,
        "launcherInfoDTO": {
            "appName": "Fortnite",
            "catalogItemId": "4fe75bbc5a674f4f9b356b5c90567da5",
            "namespace": "fn"
        }
    }]);
});

app.get('/lightswitch/api/service/Fortnite/status', async (req, res) => {
    res.json({
        "serviceInstanceId": "fortnite",
        "status": "UP",
        "message": "Fortnite is online",
        "maintenanceUri": null,
        "overrideCatalogIds": [
            "a7f138b2e51945ffbfdacc1af0541053"
        ],
        "allowedActions": ["PLAY", "DOWNLOAD"],
        "banned": false,
        "launcherInfoDTO": {
            "appName": "Fortnite",
            "catalogItemId": "4fe75bbc5a674f4f9b356b5c90567da5",
            "namespace": "fn"
        }
    });
});

app.post('/fortnite/api/game/v2/grant_access/:accountId', async (req, res) => {
    res.status(204).end();
});

app.get('/fortnite/api/game/v2/enabled_features', async (req, res) => {
    res.json([]);
});

app.get('/fortnite/api/game/v2/world/info', (req, res) => {
    const world_info = JSON.parse(fs.readFileSync('./backend/jsons/world_info.json', 'utf-8'));
    res.json(world_info);
});

app.get('/fortnite/api/receipts/v1/account/:accountId/receipts', async (req, res) => {
    res.json({});
});

app.get('/eulatracking/api/shared/agreements{*any}', async (req, res) => {
    res.json({});
});

app.get('/api/v1/events/Fortnite/download/{*any}', async (req, res) => {
    res.json({});
});

app.get('/fortnite/api/version', (req, res) => {
    res.json({
        "app": "fortnite",
        "serverDate": new Date().toISOString(),
        "overridePropertiesVersion": "unknown",
        "cln": req.cl,
        "build": "1",
        "moduleName": "Fortnite-Core",
        "buildDate": new Date().toISOString(),
        "version": req.version,
        "branch": `Release-${req.version}`,
        "modules": {}
    });
});

module.exports = app;