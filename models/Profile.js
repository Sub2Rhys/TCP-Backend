const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const profileSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    profiles: {},
}, { versionKey: false });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;