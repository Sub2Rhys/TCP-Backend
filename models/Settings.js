const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const settingsSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    seasons: {},
}, { versionKey: false });

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;