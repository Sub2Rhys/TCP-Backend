const config = require('../../config.json');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requireAdmin, validateAccount, createResponse, extractOptions, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hoster')
        .setDescription('Choose a hoster from the server.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('choose')
                .setDescription('Choose a hoster from the server.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('The username of the account.')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        ),
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const role = interaction.guild.roles.cache.get(config.discord.hoster_role);
            if (!role) {
                await interaction.respond([]);
                return;
            }
            await interaction.guild.members.fetch();
            const membersWithRole = role.members;
            const filtered = membersWithRole
                .filter(member => {
                    if (!focusedValue) return true;
                    const username = member.user.username.toLowerCase();
                    const displayName = member.displayName.toLowerCase();
                    const search = focusedValue.toLowerCase();
                    return username.includes(search) || displayName.includes(search);
                })
                .sort((a, b) => a.user.username.localeCompare(b.user.username))
                .map(member => ({
                    name: member.user.displayName,
                    value: member.id,
                }))
                .slice(0, 25);
            await interaction.respond(filtered);
        } catch (error) {
            await interaction.respond([]);
        }
    },
    async execute(interaction) {
        try {
            const options = extractOptions(interaction, ['username']);
            const hosterId = options.username;
            
            if (!(await requireAdmin(interaction))) return;
            
            const member = await interaction.guild.members.fetch(hosterId).catch(() => null);
            if (!member || !hosterId) {
                return createResponse(interaction, RESPONSES.ERROR(`That hoster was not found in the server.`));
            }
            
            const user = await validateAccount(interaction);
            if (!user) return;
            
            user.hosterId = hosterId;
            await user.save();
            
            return createResponse(interaction, RESPONSES.SUCCESS(`Your main hoster has been set to \`${member.displayName}\`.`));
        } catch (error) {            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'There was an error while executing this command.', 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                await interaction.followUp({ 
                    content: 'There was an error while executing this command.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    },
};