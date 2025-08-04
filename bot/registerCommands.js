const { Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('path');

const config = require('../config.json')
const guildId = config.discord.main_guild;
const isDebug = config.discord.debug;

module.exports = async (client) => {
    client.commands = new Collection();
    const commandsArray = [];

    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsArray.push(command.data.toJSON());
        } else {
            console.log(`The command at ${filePath} is missing properties.`);
        }
    }

    try {
        if (guildId && isDebug) {
            const guild = await client.guilds.fetch(guildId);
            await guild.commands.set(commandsArray);

            await client.application.commands.set([]);

            console.log(`Successfully registered ${commandsArray.length} guild commands`);
        } else {
            if (guildId) {
                const guild = await client.guilds.fetch(guildId);
                await guild.commands.set([]);
            }

            await client.application.commands.set(commandsArray);

            console.log(`Successfully registered ${commandsArray.length} global commands`);
        }
    } catch (error) {
        console.error('Error setting commands:', error);
    }
};