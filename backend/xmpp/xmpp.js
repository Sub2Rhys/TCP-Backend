const config = require('../../config.json');

const { client, xml } = require('@xmpp/client');

const service = `xmpp://${config.openfire.domain}`;
const domain = config.openfire.domain;

async function sendToUser(recipientId, payload) {
    const recipientJid = `${recipientId}@${domain}`;
    const adminJid = `xmpp-admin@${config.openfire.domain}`;

    const xmpp = client({
        service,
        domain,
        username: config.openfire.admin_username,
        password: config.openfire.admin_password,
        resource: '',
    });

    return new Promise((resolve, reject) => {
        xmpp.on('error', reject);

        xmpp.on('online', async () => {
            try {
                await xmpp.send(xml('presence'));

                const message = xml(
                    'message',
                    {
                        to: recipientJid,
                        from: adminJid,
                    },
                    xml('body', {}, JSON.stringify(payload))
                );

                await xmpp.send(message);
                await xmpp.stop();
                resolve();
            } catch (err) {
                reject(err);
            }
        });

        xmpp.start().catch(reject);
    });
}

module.exports = {
    sendToUser,
};