const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin, validateUser, createResponse, extractOptions, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('find')
        .setDescription('Find what version a user is playing.')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('The username of the account.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const options = extractOptions(interaction, ['username']);
        const { username } = options;

        const user = await validateUser(interaction, username);
        if (!user) return;

        const session = global.versions[user.userId];

        if (!session) {
            return createResponse(interaction, RESPONSES.ERROR(`Unable to find a session for \`${user.displayName}\`.`));
        }
        
        return createResponse(interaction, RESPONSES.SUCCESS(`\`${user.displayName}\` is currently on version \`${session.version}\`.`));
    },
};