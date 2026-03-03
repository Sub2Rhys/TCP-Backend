const mongoose = require('mongoose');
const { Schema } = mongoose;

const codeSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    item: {
        type: String,
        required: true
    },
    redeemed: {
        type: Boolean,
        default: false
    },
    redeemedBy: {
        type: String,
        default: null
    },
    redeemedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

codeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Codes', codeSchema);