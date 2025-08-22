const { SlashCommandBuilder } = require('discord.js');
const { modifyCurrency } = require('../../backend/functions/profile');
const { requireAdmin, validateUser, validateAccount, createResponse, extractOptions, RESPONSES, isAdmin } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vbucks')
        .setDescription('Changes the amount of V-Bucks the user has.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Sets the V-Buck amount on the account.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('The username for the account.')
                        .setRequired(false)
                )
                .addNumberOption(option =>
                    option
                        .setName('amount')
                        .setDescription('The amount of V-Bucks.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('difference')
                .setDescription('Add/Remove V-Bucks to/from the account.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('The username for the account.')
                        .setRequired(false)
                )
                .addNumberOption(option =>
                    option
                        .setName('amount')
                        .setDescription('The amount of V-Bucks (to remove V-Bucks enter a negative number).')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const options = extractOptions(interaction, [
            { key: 'username', type: 'string' },
            { key: 'amount', type: 'number' }
        ]);
        const { username, amount } = options;
        const currentUserId = interaction.user.id;

        let targetUser;
        if (!username) {
            targetUser = await validateAccount(interaction, true);
            if (!targetUser) return;
        } else {
            if (!isAdmin(currentUserId)) {
                return createResponse(interaction, {
                    color: 'Red',
                    title: 'Access Denied',
                    description: 'Only administrators can modify other accounts.'
                });
            }
            targetUser = await validateUser(interaction, username);
            if (!targetUser) return;
        }

        modifyCurrency(targetUser.userId, amount, subcommand);

        let description = '';
        switch (subcommand) {
            case 'set':
                description = `The user \`${targetUser.displayName}\` has had their V-Bucks total set to \`${amount.toLocaleString()}\`.`;
                break;
            case 'difference':
                description = `The user \`${targetUser.displayName}\` has had their V-Bucks changed by a total of \`${amount.toLocaleString()}\`.`;
                break;
            default:
                description = 'An unknown error occurred.';
                break;
        }

        return createResponse(interaction, RESPONSES.SUCCESS(description));
    },
};