const mongoose = require('mongoose');
const { Schema } = mongoose;

const tokenSchema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    accessToken: {
        token: {
            type: String,
            required: true,
            unique: true
        },
        tokenType: {
            type: String,
            default: 'access'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    refreshToken: {
        token: {
            type: String,
            required: true,
            unique: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    sessionId: {
        type: String
    }
}, { 
    versionKey: false,
    timestamps: true
});

tokenSchema.index({ "accessToken.expiresAt": 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ "refreshToken.expiresAt": 1 }, { expireAfterSeconds: 0 });

tokenSchema.index({ userId: 1, "accessToken.token": 1 });
tokenSchema.index({ userId: 1, "refreshToken.token": 1 });

const Tokens = mongoose.model('Tokens', tokenSchema);

module.exports = Tokens;