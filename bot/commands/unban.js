const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin, validateUser, createResponse, extractOptions, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the backend.')
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

        const user = await validateUser(interaction, username);
        if (!user) return;

        user.isBanned = false;
        await user.save();

        return createResponse(interaction, RESPONSES.SUCCESS(`The user \`${user.displayName}\` has been unbanned from the backend.`));
    },
};