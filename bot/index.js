const config = require('../config.json');

const { Client, Events, GatewayIntentBits, MessageFlags, ActivityType } = require('discord.js');
const registerCommands = require('./registerCommands');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers
    ],
});

client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.username}`);

    await registerCommands(client);

    await client.application.fetch();
    global.owner_id = client.application.owner.id;
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            await interaction.respond([]);
            return;
        }

        try {
            if (command.autocomplete) {
                await command.autocomplete(interaction);
            } else {
                await interaction.respond([]);
            }
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        await interaction.reply({ content: `No command matching ${interaction.commandName} was found.`, flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command.', flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(config.discord.bot.token);