const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin, validateUser, createResponse, extractOptions, RESPONSES } = require('../utils/helper');
const { revokeTokens } = require('../../backend/functions/tokens');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the backend.')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('The username of the account.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const options = extractOptions(interaction, ['username']);
        const { username } = options;

        if (!(await requireAdmin(interaction))) return;

        const user = await validateUser(interaction, username, true);
        if (!user) return;

        await revokeTokens(user.userId);

        return createResponse(interaction, RESPONSES.SUCCESS(`The user \`${user.displayName}\` has been kicked from the backend.`), true);
    },
};