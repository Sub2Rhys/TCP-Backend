const express = require('express');
const app = express.Router();
const fs = require('node:fs');
const path = require('path');
const crypto = require('node:crypto');
const utf8 = require('utf8');

const { Settings } = require('../../models/mongoose');
const config = require('../../config.json');

const filePath = path.join(__dirname, '../cloudstorage/DefaultEngine.ini');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    /(\[OnlineSubsystemMcp\.Xmpp\][\s\S]*?)(?=\n\[|$)/,
    section => section
        .replace(/Domain=[^\r\n]+/, `Domain="${config.openfire?.domain}"`)
        .replace(/ServerAddr=[^\r\n]+/, `ServerAddr="${config.openfire?.domain}"`)
);

fs.writeFileSync(filePath, content, 'utf8');

global.platforms = {};

function getBody(req, res, next) {
    let body = '';
    req.setEncoding('latin1');

    req.on('data', chunk => {
        body += chunk;
    });

    req.on('end', () => {
        req.rawBody = body;
        next();
    });
}

app.get('/fortnite/api/cloudstorage/system/:fileName', async (req, res) => {
    try {
        const file = fs.readFileSync(`./backend/cloudstorage/${req.params?.fileName}`);
        res.status(200).send(file);
    } catch (error) {
        res.status(204).end();
    }
});

app.get('/fortnite/api/cloudstorage/system', (req, res) => {
    let files = [];

    fs.readdirSync('./backend/cloudstorage').forEach(name => {
        if (name.toLowerCase().endsWith(".ini")) {
            const file = JSON.stringify(fs.readFileSync(`./backend/cloudstorage/${name}`));
            
            files.push({
                "uniqueFilename": name,
                "filename": name,
                "hash": crypto.createHash('sha1').update(file).digest('hex'),
                "hash256": crypto.createHash('sha256').update(file).digest('hex'),
                "length": file?.length,
                "contentType": "application/octet-stream",
                "uploaded": "2024-11-30T16:31:23.328Z",
                "storageType": "S3",
                "storageIds": {},
                "doNotCache": true
            });
        }
    });

    res.json(files);
});

app.get('/fortnite/api/cloudstorage/user/:accountId/:fileName', requireAuth, async (req, res) => {
    if (req.cl == 3807424 || req.cl == 3825894) {
        req.season = '1';
    }

    let settings = await Settings.findOne({ userId: req.user?.userId });

    if (!settings) {
        settings = new Settings({
            userId: req.user?.userId,
        });
        await settings.save();
    }

    const binds = settings.seasons?.[req.season];

    if (binds) {
        const decodedBinds = utf8.decode(binds);
        res.status(200).send(Buffer.from(decodedBinds, 'latin1'));
    } else {
        res.status(200).send(fs.readFileSync('./backend/cloudstorage/ClientSettings.sav'));
    }
});

app.put('/fortnite/api/cloudstorage/user/:accountId/:fileName', getBody, requireAuth, async (req, res) => {
    const fileName = req.params?.fileName;
    if (fileName?.toLowerCase()?.includes('clientsettings')) {
        global.platforms[req.user?.userId] = fileName.replace(/^ClientSettings|\.sav$/g, '');
    }

    if (req.cl == 3807424 || req.cl == 3825894) {
        req.season = '1';
    }

    let settings = await Settings.findOne({ userId: req.user?.userId });

    if (!settings) {
        settings = new Settings({
            userId: req.user?.userId,
        });
        await settings.save();
    }

    await Settings.updateOne(
        { userId: req.user?.userId },
        { $set: { [`seasons.${req.season}`]: utf8.encode(req.rawBody) } }
    ).lean();

    res.status(204).end();
});

app.get('/fortnite/api/cloudstorage/user/{*any}', requireAuth, async (req, res) => {
    try {
        const platform = global.platforms[req.user?.userId];
        const name = `ClientSettings${platform}.sav`;
        let fileData = fs.readFileSync(`./backend/cloudstorage/${name}`);

        let settings = await Settings.findOne({ userId: req.user?.userId });
        if (!settings) {
            settings = new Settings({ userId: req.user?.userId });
            await settings.save();
        }

        const binds = settings.seasons?.[req.season];

        if (binds) {
            const decodedBinds = Buffer.from(utf8.decode(binds), 'latin1');
            fileData = decodedBinds;
        }

        res.json({
            "uniqueFilename": name,
            "filename": name,
            "hash": crypto.createHash('sha1').update(fileData).digest('hex'),
            "hash256": crypto.createHash('sha256').update(fileData).digest('hex'),
            "length": fileData.length,
            "contentType": 'application/octet-stream',
            "uploaded": "2024-11-30T16:31:23.328Z",
            "storageType": "S3",
            "storageIds": {},
            "accountId": req.user?.userId,
            "doNotCache": false
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

module.exports = app;