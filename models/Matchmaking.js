const mongoose = require('mongoose');
const { Schema } = mongoose;

const matchmakingSchema = new Schema({
    key: { 
        type: String, 
    },
    address: { 
        type: String, 
    },
    port: { 
        type: Number, 
    },
    createdAt: { 
        type: Date, 
        default: Date.now
    },
    updatedAt: { 
        type: Date, 
        default: Date.now
    }
}, { versionKey: false });

matchmakingSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    
    if (!this.createdAt) {
        this.createdAt = new Date();
    }
    
    next();
});

const Matchmaking = mongoose.model('Matchmaking', matchmakingSchema);

module.exports = Matchmaking;