const mongoose = require('mongoose');
const { Schema } = mongoose;

const serversSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    news: [],
    address: { type: String },
    port: { type: Number },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Servers = mongoose.model('Servers', serversSchema);

module.exports = Servers;