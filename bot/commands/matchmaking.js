const { SlashCommandBuilder } = require('discord.js');
const { Matchmaking, Servers } = require('../../models/mongoose');
const { requireAdmin, requireHoster, createResponse, extractOptions, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('matchmaking')
        .setDescription('Perform different actions to do with matchmaking.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a custom matchmaking key to assign to a gameserver.')
                .addStringOption(option =>
                    option
                        .setName('key')
                        .setDescription('The custom key the player can use (case-sensitive)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('address')
                        .setDescription('A public IP or domain')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('port')
                        .setDescription('Default: 7777')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an existing matchmaking key.')
                .addStringOption(option =>
                    option
                        .setName('key')
                        .setDescription('The matchmaking key to delete (case-sensitive)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set your current matchmaking key.')
                .addStringOption(option =>
                    option
                        .setName('key')
                        .setDescription('The matchmaking key to set (case-sensitive)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check your current matchmaking key.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear your current matchmaking key.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('host')
                .setDescription('Set an IP and port for hosting.')
                .addStringOption(option =>
                    option
                        .setName('address')
                        .setDescription('A public IP or domain')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('port')
                        .setDescription('Default: 7777')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const options = extractOptions(interaction, [
            { key: 'key', type: 'string' },
            { key: 'address', type: 'string' },
            { key: 'port', type: 'string' }
        ]);
        let { key, address, port } = options;

        if (subcommand === 'create') {
            if (!(await requireAdmin(interaction))) return;

            if (key.toLowerCase() == 'clear') {
                return createResponse(interaction, RESPONSES.ERROR(`The key \`${key}\` cannot be created.`));
            }

            if (address && address.includes(':')) {
                const parts = address.split(':');
                address = parts[0];
                port = parts[1];
            }

            const existingKey = await Matchmaking.findOne({ key });
            if (existingKey) {
                return createResponse(interaction, RESPONSES.ERROR(`The key \`${key}\` already exists.`));
            }

            const matchmaking = new Matchmaking({
                key,
                address,
                port: port || 7777,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await matchmaking.save();
            return createResponse(interaction, RESPONSES.SUCCESS(`The matchmaking key \`${key}\` has been created successfully.`));
        }

        if (subcommand === 'delete') {
            if (!(await requireAdmin(interaction))) return;

            const existingKey = await Matchmaking.findOne({ key });
            if (!existingKey) {
                return createResponse(interaction, RESPONSES.ERROR('No matchmaking key found with that value.'));
            }

            await Matchmaking.deleteOne({ key });
            return createResponse(interaction, RESPONSES.SUCCESS(`The matchmaking key \`${key}\` has been deleted.`));
        }

        if (subcommand === 'set') {
            const existingKey = await Matchmaking.findOne({ key });
            if (!existingKey) {
                return createResponse(interaction, RESPONSES.ERROR(`No matchmaking key \`${key}\` was found.`));
            }

            global.keys[interaction.user.id] = key;
            return createResponse(interaction, RESPONSES.SUCCESS(`Your matchmaking key has been set to \`${key}\`.`));
        }

        if (subcommand === 'check') {
            const currKey = global.keys[interaction.user.id];
            if (!currKey) {
                return createResponse(interaction, RESPONSES.ERROR(`Your current matchmaking key is not set.`));
            } else {
                return createResponse(interaction, RESPONSES.SUCCESS(`Your current matchmaking key is set to \`${currKey}\`.`));
            }
        }

        if (subcommand === 'clear') {
            delete global.keys[interaction.user.id];
            return createResponse(interaction, RESPONSES.SUCCESS(`Your matchmaking key has been cleared.`));
        }

        if (subcommand === 'host') {
            if (!(await requireHoster(interaction))) return;

            let userServers = await Servers.findOne({ userId: interaction.user.id });

            if (!userServers) {
                userServers = new Servers({
                    userId: interaction.user.id,
                    address,
                    port: port || 7777
                });
            } else {
                userServers.address = address;
                userServers.port = port;
                userServers.updatedAt = new Date();
            }

            await userServers.save();

            return createResponse(interaction, RESPONSES.SUCCESS(`Your hosting matchmaking options has been set to \`${address}:${port || 7777}\`.`));
        }
    },
};