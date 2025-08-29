const { xml } = require('@xmpp/client');
const Matchmaking = require('../../../../models/Matchmaking');

global.keys = {};

module.exports = {
    name: 'key',
    async execute({ client, args, userId, roomJID }) {
        const cleanId = String(userId).match(/\d+/)?.[0];

        if (!cleanId || !args[0]) {
            return;
        }

        if (args[0].toLowerCase() === 'clear') {
            delete global.keys[cleanId];
            
            const message = xml('message', { 
                type: 'groupchat', 
                to: roomJID 
            }, xml('body', {}, 'Matchmaking code cleared'));
            
            await client.send(message);
        } else {
            const matchmakingCode = args[0];
            
            try {
                const matchmakingEntry = await Matchmaking.findOne({ key: matchmakingCode });
                
                if (matchmakingEntry) {
                    global.keys[cleanId] = matchmakingCode;
                    
                    const message = xml('message', { 
                        type: 'groupchat', 
                        to: roomJID 
                    }, xml('body', {}, `Code set to "${matchmakingCode}"`));
                    
                    await client.send(message);
                } else {
                    const message = xml('message', { 
                        type: 'groupchat', 
                        to: roomJID 
                    }, xml('body', {}, 'Code not valid'));
                    
                    await client.send(message);
                }
            } catch (error) {}
        }
    }
};