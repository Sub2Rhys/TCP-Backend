const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, ButtonStyle, MessageFlags, Events, TextInputStyle } = require('discord.js');
const axios = require('axios');
const fs = require('node:fs');
const { Profile } = require('../../models/mongoose');
const { validateUser, validateAccount, createResponse, extractOptions, RESPONSES, isAdmin, requireAdmin } = require('../utils/helper');
const { modifyCurrency } = require('../../backend/functions/profile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('locker')
        .setDescription('Perform different actions on your locker.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Get the statistics of your locker.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bless')
                .setDescription('Give an account every item from season 1 - 10.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('The username for the account.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset a locker.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('The username for the account.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('epic')
                .setDescription('Replicate your real Fortnite locker.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const options = extractOptions(interaction, [
            { key: 'username', type: 'string' }
        ]);
        const { username } = options;
        const currentUserId = interaction.user.id;

        if (subcommand === 'bless') {
            const user = await validateUser(interaction, username);
            if (!user) return;

            if (user.userId !== currentUserId && !isAdmin(currentUserId)) {
                return createResponse(interaction, {
                    color: 'Red',
                    title: 'Access Denied',
                    description: 'You can only modify your own locker.'
                });
            }

            const complete_athena = JSON.parse(
                fs.readFileSync('./backend/jsons/profiles/complete/athena.json', 'utf-8')
                  .replace(/USER_ID/g, user.userId)
            );

            await Profile.updateOne(
                { userId: user.userId },
                { 
                    $set: {
                        [`profiles.athena.profileChanges.0.profile.items`]: complete_athena.profileChanges?.[0].profile.items,
                    } 
                }
            ).lean();

            return createResponse(interaction, RESPONSES.SUCCESS(`The user \`${user.displayName}\` has been blessed with every cosmetic in the game.`));
        }

        if (subcommand === 'reset') {
            const user = await validateUser(interaction, username);
            if (!user) return;

            if (user.userId !== currentUserId && !isAdmin(currentUserId)) {
                return createResponse(interaction, {
                    color: 'Red',
                    title: 'Access Denied',
                    description: 'You can only modify your own locker.'
                });
            }

            const profile = await Profile.findOne({ userId: user.userId });
            if (!profile) {
                return createResponse(interaction, RESPONSES.ERROR('Profile not found for this user.'));
            }

            const athena = JSON.parse(
                fs.readFileSync('./backend/jsons/profiles/athena.json', 'utf-8')
                  .replace(/USER_ID/g, user.userId)
            );
            const common_core = JSON.parse(
                fs.readFileSync('./backend/jsons/profiles/common_core.json', 'utf-8')
                  .replace(/USER_ID/g, user.userId)
            );

            const createdAt = new Date().toISOString();
            athena.profileChanges[0].profile.created = createdAt;
            common_core.profileChanges[0].profile.created = createdAt;

            profile.profiles = {
                athena: athena,
                common_core: common_core,
            };

            await profile.save();

            return createResponse(interaction, RESPONSES.SUCCESS(`The locker for \`${user.displayName}\` has been reset successfully.`));
        }

        if (subcommand === 'stats') {
            const user = await validateAccount(interaction, true);
            if (!user) return;

            const profile = await Profile.findOne({ userId: user.userId });
            if (!profile) {
                return createResponse(interaction, RESPONSES.ERROR('Profile not found. Please contact an administrator.'), true);
            }

            const itemTypeMap = {
                'cid_': 'Outfits',
                'character_': 'Outfits',
                'bid_': 'Back Blings',
                'backpack_': 'Back Blings',
                'pickaxe': 'Pickaxes',
                'eid_': 'Emotes',
                'spray_': 'Emotes',
                'spid_': 'Emotes',
                'emoji_': 'Emotes',
                'glider': 'Gliders',
                'umbrella_': 'Gliders',
                'contrail_': 'Contrails',
                'trails_': 'Contrails',
                'loadingscreen_': 'Loading Screens',
                'lsid_': 'Loading Screens',
                'musicpack_': 'Music Packs',
                'wrap_': 'Wraps'
            };

            const profileChanges = profile.profiles.athena.profileChanges?.[0].profile;
            const items = profileChanges.items;
            const filteredItems = {};
            
            Object.values(itemTypeMap).forEach(type => {
                filteredItems[type] = [];
            });
            
            Object.entries(itemTypeMap).forEach(([key, value]) => {
                Object.entries(items)
                    .filter(([itemKey, itemValue]) => itemKey.toLowerCase().includes(key.toLowerCase()))
                    .forEach(([itemKey, itemValue]) => {
                        filteredItems[value].push(itemValue);
                    });
            });

            const embed = await require('../createEmbed.js')(interaction);
            embed.setColor('Grey')
                 .setTitle(`Locker Statistics`)
                 .setDescription(`The locker for \`${user.displayName}\` has a total of \`${Object.keys(items).length.toLocaleString()}\` cosmetics.`);
            
            Object.keys(filteredItems).forEach(type => {
                const typeCount = filteredItems[type].length;
                embed.addFields({ name: type, value: `\`${typeCount.toLocaleString()}\``, inline: true });
            });
            
            embed.addFields(
                { name: '\n', value: `\n` },
                { name: 'Created', value: `<t:${Math.floor(new Date(profileChanges.created).getTime() / 1000)}:R>`, inline: true },
                { name: 'Updated', value: `<t:${Math.floor(new Date(profileChanges.updated).getTime() / 1000)}:R>`, inline: true }
            );

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'epic') {
            const user = await validateAccount(interaction, true);
            if (!user) return;

            if (user.userId !== currentUserId) {
                return createResponse(interaction, {
                    color: 'Red',
                    title: 'Access Denied',
                    description: 'You can only modify your own locker.'
                });
            }

            const embed = await require('../createEmbed.js')(interaction);
            embed.setColor('Blue')
                .setTitle('Epic Games Login')
                .setDescription('Get your authentication code from the link below, then click the button to enter your code to replicate your Fortnite locker.\n\n[**Get Authentication Code**](https://www.epicgames.com/id/api/redirect?clientId=3f69e56c7649492c8cc29f1af08a8a12&responseType=code)');

            const button = new ButtonBuilder()
                .setCustomId('open_epic_auth_modal')
                .setLabel('Submit Code')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                flags: MessageFlags.Ephemeral 
            });

            const client = interaction.client;

            const buttonHandler = async (innerInteraction) => {
                if (!innerInteraction.isButton() || innerInteraction.customId !== 'open_epic_auth_modal') return;
                if (innerInteraction.user.id !== interaction.user.id) return;

                const modal = new ModalBuilder()
                    .setCustomId('epic_auth_modal')
                    .setTitle('Epic Games Login');

                const codeInput = new TextInputBuilder()
                    .setCustomId('epic_auth_code')
                    .setLabel('Enter your authentication code')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Paste your code here...');

                const modalRow = new ActionRowBuilder().addComponents(codeInput);
                modal.addComponents(modalRow);

                await innerInteraction.showModal(modal);
            };

            const modalHandler = async (innerInteraction) => {
                if (!innerInteraction.isModalSubmit() || innerInteraction.customId !== 'epic_auth_modal') return;
                if (innerInteraction.user.id !== interaction.user.id) return;

                await innerInteraction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    const auth_code = innerInteraction.fields.getTextInputValue('epic_auth_code');

                    if (!auth_code || auth_code.trim() === '') {
                        return createResponse(innerInteraction, RESPONSES.ERROR('Authentication code cannot be empty.'), true);
                    }

                    const tokenResponse = await axios.post('https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token', {
                        grant_type: 'authorization_code',
                        code: auth_code.trim()
                    }, {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': 'basic M2Y2OWU1NmM3NjQ5NDkyYzhjYzI5ZjFhZjA4YThhMTI6YjUxZWU5Y2IxMjIzNGY1MGE2OWVmYTY3ZWY1MzgxMmU'
                        }
                    });

                    const accessToken = tokenResponse.data.access_token;
                    const accountId = tokenResponse.data.account_id;

                    if (!accessToken || !accountId) {
                        return createResponse(innerInteraction, RESPONSES.ERROR('Failed to authenticate with Fortnite. Please try again.'), true);
                    }

                    const athena = await axios.post(`https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/${accountId}/client/QueryProfile?profileId=athena&rvn=-1`, {}, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const epicAthena = athena.data;
                    const epicAthenaItems = epicAthena.profileChanges?.[0]?.profile?.items;

                    if (!epicAthenaItems) {
                        return createResponse(innerInteraction, RESPONSES.ERROR('Could not retrieve your \`athena\` profile. Please try again.'), true);
                    }

                    const common_core = await axios.post(`https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/${accountId}/client/QueryProfile?profileId=common_core&rvn=-1`, {}, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const epicCore = common_core.data;
                    const epicCoreItems = epicCore.profileChanges?.[0]?.profile?.items;

                    if (!epicCoreItems) {
                        return createResponse(innerInteraction, RESPONSES.ERROR('Could not retrieve your \`common_core\` profile. Please try again.'), true);
                    }

                    await Profile.updateOne(
                        { userId: user.userId },
                        { 
                            $set: {
                                'profiles.athena.profileChanges.0.profile.items': epicAthenaItems,
                                'profiles.athena.profileChanges.0.profile.updated': new Date().toISOString()
                            } 
                        }
                    );

                    const itemsArray = Object.values(epicCoreItems);
                    
                    const totalQuantity = itemsArray
                        .filter(obj =>
                            obj?.templateId?.toLowerCase() === 'currency:mtxpurchased' ||
                            obj?.templateId?.toLowerCase() === 'currency:mtxgiveaway'
                        )
                        .reduce((sum, item) => sum + (item.quantity ?? 0), 0);
                    
                    if (typeof totalQuantity === 'number' && totalQuantity >= 0) {
                        modifyCurrency(user.userId, totalQuantity, 'set');
                    }

                    const itemCount = Object.keys(epicAthenaItems).length;
                    return createResponse(innerInteraction, RESPONSES.SUCCESS(`Successfully replicated your real Fortnite locker. \`${itemCount.toLocaleString()}\` items have been imported.`), true);
                } catch (error) {
                    console.error('Epic auth error:', error);
                    
                    if (error.response?.status === 400) {
                        return createResponse(innerInteraction, RESPONSES.ERROR('Invalid or expired authentication code. Please get a new code and try again.'), true);
                    } else if (error.response?.status === 403) {
                        return createResponse(innerInteraction, RESPONSES.ERROR('Access denied by Fortnite. Please make sure you have the correct permissions.'), true);
                    } else {
                        return createResponse(innerInteraction, RESPONSES.ERROR('An error occurred while replicating your locker. Please try again later.'), true);
                    }
                }
            };

            client.on(Events.InteractionCreate, buttonHandler);
            client.on(Events.InteractionCreate, modalHandler);

            setTimeout(() => {
                client.removeListener(Events.InteractionCreate, buttonHandler);
                client.removeListener(Events.InteractionCreate, modalHandler);
            }, 300000);
        }
    },
};