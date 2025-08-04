const mongoose = require('mongoose');
const { Schema } = mongoose;

const friendsSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    list: {
        friends: {
            type: Array,
        },
        incoming: {
            type: Array,
        },
        outgoing: {
            type: Array,
        },
        blocklist: {
            type: Array,
        },
    },
    settings: {
        acceptInvites: {
            type: String,
            default: 'public'
        }
    }
}, { versionKey: false });

const Friends = mongoose.model('Friends', friendsSchema);

module.exports = Friends;