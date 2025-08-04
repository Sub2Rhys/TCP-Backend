global.keys = {};

module.exports = {
    name: 'key',
    async execute({ client, args, userId }) {
        const cleanId = String(userId).match(/\d+/)?.[0];

        if (!cleanId || !args[0]) {
            return;
        }

        if (args[0].toLowerCase() == 'clear') {
            delete global.keys[cleanId];
        } else {
            global.keys[cleanId] = args[0];
        }
    }
};