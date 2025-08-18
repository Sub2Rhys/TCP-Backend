const config = require('../config.json');
const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const registerCommands = require('./registerCommands');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.on('error', error => console.error('Client error:', error));

process.on('unhandledRejection', error => console.error('Unhandled promise rejection:', error));

client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.username}`);
    await registerCommands(client);
    await client.application.fetch();
    global.owner_id = client.application.owner.id;
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return interaction.respond([]);
            if (command.autocomplete) {
                await command.autocomplete(interaction);
            } else {
                await interaction.respond([]);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            return interaction.reply({ content: `No command matching ${interaction.commandName} was found.`, flags: MessageFlags.Ephemeral });
        }

        await command.execute(interaction);
    } catch (error) {
        console.error('Interaction error:', error);

        const replyOptions = { content: 'There was an error while executing this command.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(replyOptions);
        } else {
            await interaction.reply(replyOptions);
        }
    }
});

client.login(config.discord?.bot?.token);