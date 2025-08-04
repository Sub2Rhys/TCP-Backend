const config = require('../config.json');

function mongoDB() {
    try {
        const mongoose = require('mongoose');
        mongoose.connect(config.database_url).then(() => {
            console.log("MongoDB connected");
        });
    } catch (error) {
        console.error("MongoDB failed to connect");
        process.exit(1);
    }
};

const User = require('./User');
const Profile = require('./Profile');
const Settings = require('./Settings');
const Friends = require('./Friends');
const Matchmaking = require('./Matchmaking');
const Tokens = require('./Tokens');
const Servers = require('./Servers');

module.exports = {
    mongoDB,
    User,
    Profile,
    Settings,
    Friends,
    Matchmaking,
    Tokens,
    Servers
};