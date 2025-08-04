const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    userId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    displayName: { 
        type: String, 
    },
    email: { 
        type: String, 
        trim: true 
    },
    password: { 
        type: String, 
    },
    isBanned: { 
        type: Boolean, 
    },
    hosterId: { 
        type: String, 
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

userSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    
    if (!this.createdAt) {
        this.createdAt = new Date();
    }
    
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;