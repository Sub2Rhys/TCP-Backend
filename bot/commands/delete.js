const { SlashCommandBuilder } = require('discord.js');
const { User, Profile, Friends, Settings } = require('../../models/mongoose');
const { createResponse, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete a user or host account.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Delete your user account.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('host')
                .setDescription('Delete your host account.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const hostId = `host-${userId}`;

        if (subcommand === 'user') {
            const user = await User.findOne({ userId });
            if (!user) {
                return createResponse(interaction, RESPONSES.WARNING('No user account to delete.'), true);
            }

            await Promise.all([
                User.deleteOne({ userId }),
                Profile.deleteOne({ userId }),
                Friends.deleteOne({ userId }),
                Settings.deleteOne({ userId })
            ]);

            return createResponse(interaction, RESPONSES.SUCCESS('Your user account was deleted.'), true);
        }

        if (subcommand === 'host') {
            const host = await User.findOne({ userId: hostId });
            if (!host) {
                return createResponse(interaction, RESPONSES.WARNING('No host account to delete.'), true);
            }

            await Promise.all([
                User.deleteOne({ userId: hostId }),
                Profile.deleteOne({ userId: hostId }),
                Friends.deleteOne({ userId: hostId }),
                Settings.deleteOne({ userId: hostId })
            ]);

            return createResponse(interaction, RESPONSES.SUCCESS('Your host account was deleted.'), true);
        }
    }
};