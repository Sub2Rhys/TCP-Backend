const { SlashCommandBuilder } = require('discord.js');
const bcrypt = require('bcrypt');
const fs = require('node:fs');
const { User, Profile, Friends } = require('../../models/mongoose');
const { createResponse, extractOptions, RESPONSES } = require('../utils/helper');

async function createUserProfiles(userId) {
    const athena = JSON.parse(fs.readFileSync('./backend/jsons/profiles/athena.json', 'utf-8').replace(/USER_ID/g, userId));
    const core = JSON.parse(fs.readFileSync('./backend/jsons/profiles/common_core.json', 'utf-8').replace(/USER_ID/g, userId));
    
    const createdAt = new Date().toISOString();
    athena.profileChanges[0].profile.created = createdAt;
    core.profileChanges[0].profile.created = createdAt;

    await Promise.all([
        new Profile({ userId, profiles: { athena, common_core: core } }).save(),
        new Friends({ userId }).save()
    ]);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Create a user or host account.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Create a user account.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Username')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('email')
                        .setDescription('Email')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('password')
                        .setDescription('Password')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('host')
                .setDescription('Create a host account.')
                .addStringOption(option =>
                    option.
                        setName('email')
                        .setDescription('Email')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('password')
                        .setDescription('Password')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const options = extractOptions(interaction, [
            { key: 'username', type: 'string' },
            { key: 'email', type: 'string' },
            { key: 'password', type: 'string' }
        ]);
        const { username, email, password } = options;
        const userId = interaction.user.id;

        if (subcommand === 'user') {
            if (await User.findOne({ displayName: username })) {
                return createResponse(interaction, RESPONSES.ERROR(`Username \`${username}\` has already been taken.`), true);
            }
        
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({
                userId,
                displayName: username,
                email,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await newUser.save();
        
            await createUserProfiles(userId);
        
            await createResponse(interaction, RESPONSES.SUCCESS(`Your account \`${username}\` has been created successfully.`), true);
            return createResponse(interaction, RESPONSES.SUCCESS(`Your account \`${username}\` has been created successfully.`), false, true);
        }

        if (subcommand === 'host') {
            const hostId = `host-${userId}`;

            if (await User.findOne({ userId: hostId })) {
                return createResponse(interaction, RESPONSES.ERROR('You already have a host account.'), true);
            }

            const hashedPassword = password ? await bcrypt.hash(password, 10) : '';
            await new User({
                userId: hostId,
                displayName: hostId,
                email,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date()
            }).save();

            await createUserProfiles(hostId);

            await createResponse(interaction, RESPONSES.SUCCESS('Your host account has been created.'), true);
            return createResponse(interaction, RESPONSES.SUCCESS('Your host account has been created.'), false, true);
        }
    }
};