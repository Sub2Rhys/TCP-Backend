const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const bcrypt = require('bcrypt');
const { User } = require('../../models/mongoose');
const { createResponse, validateAccount, extractOptions, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('View or modify your account.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('details')
                .setDescription('Get your account details.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('change')
                .setDescription('Change your account details.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('New username')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('email')
                        .setDescription('New email')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('password')
                        .setDescription('New password')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const options = extractOptions(interaction, [
            { key: 'username', type: 'username' },
            { key: 'email', type: 'string' },
            { key: 'password', type: 'string' }
        ]);
        const { username, email, password } = options;
        
        const user = await validateAccount(interaction, true);
        if (!user) return;

        if (subcommand === 'details') {
            const embed = await require('../createEmbed.js')(interaction);
            embed.setColor('Grey').setTitle('Account Details')
                .addFields(
                    { name: 'Username', value: user.displayName, inline: true },
                    { name: 'Email', value: user.email, inline: true },
                    { name: 'Created', value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`, inline: true },
                    { name: 'Updated', value: `<t:${Math.floor(user.updatedAt.getTime() / 1000)}:R>`, inline: true }
                );

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'change') {
            if (!username && !email && !password) {
                return createResponse(interaction, RESPONSES.WARNING('Provide an username, email or password to change.'), true);
            }

            if (username) {
                if (await User.findOne({ displayName: username })) {
                    return createResponse(interaction, RESPONSES.ERROR('That username is already taken.'), true);
                }
                user.displayName = username;
            }
            if (email) user.email = email;
            if (password) user.password = await bcrypt.hash(password, 10);

            await user.save();
            return createResponse(interaction, RESPONSES.SUCCESS('Your account has been updated successfully.'), true);
        }
    }
};