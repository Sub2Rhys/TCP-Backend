const { SlashCommandBuilder } = require('discord.js');
const { modifyCurrency } = require('../../backend/functions/profile');
const { requireAdmin, validateUser, createResponse, extractOptions, RESPONSES } = require('../utils/helper');

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
                        .setRequired(true)
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
                        .setRequired(true)
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

        if (!(await requireAdmin(interaction))) return;

        const user = await validateUser(interaction, username);
        if (!user) return;

        modifyCurrency(user.userId, amount, subcommand);

        let description = '';
        switch (subcommand) {
            case 'set':
                description = `The user \`${user.displayName}\` has had their V-Bucks total set to \`${amount.toLocaleString()}\`.`;
                break;
            case 'difference':
                description = `The user \`${user.displayName}\` has had their V-Bucks changed by a total of \`${amount.toLocaleString()}\`.`;
                break;
            default:
                description = 'An unknown error occurred.';
                break;
        }

        return createResponse(interaction, RESPONSES.SUCCESS(description));
    },
};