const express = require('express');
const bodyParser = require('body-parser');
const fs = require('node:fs');
const path = require('path');

const config = require('./config.json');

const app = express();

app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
app.use(bodyParser.text({ limit: '50mb' }));

app.use("/images", express.static(path.join(__dirname, "backend/images")));

const { mongoDB } = require('./models/mongoose');
mongoDB();

const { requireAuth } = require('./middleware/auth');
global.requireAuth = requireAuth;

const { getVersion } = require('./middleware/version');
app.use(getVersion);

app.set('trust proxy', true);

require('./backend/xmpp/xmpp');
require('./backend/xmpp/matchmaker');
require('./bot/index');

const endpoints = fs.readdirSync('./backend/routes');
endpoints.forEach(async name => {
    if (!name.includes('.js')) return;
    try {
        app.use('/', require(`./backend/routes/${name}`).app);
    } catch (error) {
        app.use('/', require(`./backend/routes/${name}`));
    }
});

const port = config.port || 8080;
app.listen(port, () => {
    console.log(`XMPP listening on port ${port}`);
});