const config = require('../../../config.json');
const fs = require('fs');
const path = require('path');
const { client, xml } = require('@xmpp/client');

global.commands = new Map();

const openfireConfig = {
    service: `xmpp://${config.openfire.domain}:5222`,
    domain: config.openfire.domain,
    mucRoom: `globalchat@muc.${config.openfire.domain}`
};

const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach(file => {
    if (file.endsWith('.js')) {
        const command = require(`./commands/${file}`);
        if (command.name && typeof command.execute === 'function') {
            global.commands.set(command.name, command);
        }
    }
});

const adminXmpp = client({
    service: openfireConfig.service,
    domain: openfireConfig.domain,
    username: config.openfire.admin_username,
    password: config.openfire.admin_password
});

let firstConnect = true;
let kickedAdmin = false;

adminXmpp.on('error', () => { });
adminXmpp.on('offline', () => { });
adminXmpp.on('status', () => { });

adminXmpp.on('online', async () => {
    try {
        const presence = xml('presence', {
            to: `${openfireConfig.mucRoom}/admin`
        }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }));
        await adminXmpp.send(presence);
    } catch { }
});

adminXmpp.on('stanza', async stanza => {
    try {
        if (stanza.is('presence') && stanza.attrs.from.startsWith(openfireConfig.mucRoom)) {
            const nick = stanza.attrs.from.split('/')[1];
            if (!nick) return;

            if (firstConnect && nick === 'admin' && !kickedAdmin) {
                const iq = xml(
                    'iq',
                    { type: 'set', to: openfireConfig.mucRoom, id: 'kick-admin' },
                    xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
                        xml('item', { nick, role: 'none' })
                    )
                );
                await adminXmpp.send(iq);
                kickedAdmin = true;

                setTimeout(async () => {
                    try {
                        const presence = xml('presence', {
                            to: `${openfireConfig.mucRoom}/admin`
                        }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }));
                        await adminXmpp.send(presence);
                    } catch { }
                }, 500);
            }
        }

        if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
            const body = stanza.getChildText('body');
            const from = stanza.attrs.from;
            if (!body || !from.includes('/')) return;

            const nickname = from.split(':')[1];
            if (nickname === 'admin') return;

            const userId = from.match(/:(\d{17,20}):/);

            if (body.startsWith('!') || body.startsWith('/')) {
                const args = body.slice(1).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = global.commands.get(commandName);

                if (command) {
                    try {
                        await command.execute({
                            client: adminXmpp,
                            args,
                            userId
                        });
                    } catch { }
                }
            }
        }
    } catch { }
});

(async () => {
    try {
        await adminXmpp.start();
    } catch {
        setTimeout(() => {
            adminXmpp.start().catch(() => { });
        }, 5000);
    }
})();