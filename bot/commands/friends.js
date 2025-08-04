const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { User, Friends } = require('../../models/mongoose');
const { requireAdmin, createResponse, extractOptions, RESPONSES, validateAccount, findUserByUsername } = require('../utils/helper');
const { sendToUser } = require('../../backend/xmpp/xmpp');

async function ensureFriendsDocument(userId) {
    let friendsDoc = await Friends.findOne({ userId });
    if (!friendsDoc) {
        friendsDoc = new Friends({
            userId,
            list: {
                friends: [],
                incoming: [],
                outgoing: [],
                blocklist: []
            },
            settings: {
                acceptInvites: 'public'
            }
        });
        await friendsDoc.save();
    }
    return friendsDoc;
}

function createFriendEntry(accountId, direction, alias = null, note = null, favorite = false) {
    return {
        accountId,
        status: direction === 'PENDING_OUTBOUND' || direction === 'PENDING_INBOUND' ? 'PENDING' : 'ACCEPTED',
        direction: direction === 'PENDING_OUTBOUND' ? 'OUTBOUND' : direction === 'PENDING_INBOUND' ? 'INBOUND' : direction,
        alias,
        note,
        created: new Date().toISOString(),
        favorite
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('friends')
        .setDescription('Manage your friends list.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View your friends list.')
                .addStringOption(option =>
                    option
                        .setName('filter')
                        .setDescription('Filter friends by status')
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Friends', value: 'friends' },
                            { name: 'Incoming Requests', value: 'incoming' },
                            { name: 'Outgoing Requests', value: 'outgoing' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Send a friend request to a user.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Username of the person to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a friend or cancel a friend request.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Username of the person to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept an incoming friend request.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Username of the person to accept')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('block')
                .setDescription('Block a user.')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Username of the person to block')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const options = extractOptions(interaction, [
            { key: 'username', type: 'string' },
            { key: 'filter', type: 'string' }
        ]);
        const { username, filter } = options;
        const userId = interaction.user.id;

        const user = await validateAccount(interaction);
        if (!user) return;

        if (subcommand === 'list') {
            try {
                const friendsDoc = await ensureFriendsDocument(userId);
                const filterType = filter || 'all';
                
                let friendsList = [];
                let title = 'Friends List';

                if (filterType === 'all' || filterType === 'friends') {
                    for (const friend of friendsDoc.list.friends) {
                        const friendUser = await User.findOne({ userId: friend.accountId });
                        friendsList.push({
                            username: friendUser?.displayName || 'Unknown User',
                            status: 'ACCEPTED',
                            direction: friend.direction || 'OUTBOUND',
                            created: friend.created,
                            favorite: friend.favorite || false,
                            alias: friend.alias
                        });
                    }
                }

                if (filterType === 'all' || filterType === 'incoming') {
                    for (const request of friendsDoc.list.incoming) {
                        const friendUser = await User.findOne({ userId: request.accountId });
                        friendsList.push({
                            username: friendUser?.displayName || 'Unknown User',
                            status: 'PENDING',
                            direction: 'INBOUND',
                            created: request.created,
                            favorite: false
                        });
                    }
                }

                if (filterType === 'all' || filterType === 'outgoing') {
                    for (const request of friendsDoc.list.outgoing) {
                        const friendUser = await User.findOne({ userId: request.accountId });
                        friendsList.push({
                            username: friendUser?.displayName || 'Unknown User',
                            status: 'PENDING',
                            direction: 'OUTBOUND',
                            created: request.created,
                            favorite: false
                        });
                    }
                }

                if (friendsList.length === 0) {
                    return createResponse(interaction, RESPONSES.WARNING('Your friends list is empty.'));
                }

                friendsList.sort((a, b) => new Date(b.created) - new Date(a.created));

                let currentPage = 0;
                const itemsPerPage = 5;
                const totalPages = Math.ceil(friendsList.length / itemsPerPage);

                const createEmbed = (page) => {
                    const start = page * itemsPerPage;
                    const end = start + itemsPerPage;
                    const pageItems = friendsList.slice(start, end);

                    let description = '';
                    pageItems.forEach((friend, index) => {
                        const displayName = friend.alias ? `${friend.alias} (${friend.username})` : friend.username;
                        
                        description += `**${displayName}**\n`;
                        description += `Status: ${friend.status} ${friend.status === 'PENDING' ? `(${friend.direction})` : ''}\n`;
                        description += `Added: ${new Date(friend.created).toLocaleDateString()}\n\n`;
                    });

                    return description;
                };

                const createButtons = (page) => {
                    return new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('previous')
                                .setLabel('⬅️ Previous')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('Next ➡️')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === totalPages - 1)
                        );
                };

                const embed = await require('../createEmbed.js')(interaction);
                embed.setColor('Blue')
                    .setTitle(`${title} (${filterType.charAt(0).toUpperCase() + filterType.slice(1)})`)
                    .setDescription(createEmbed(currentPage))
                    .setFooter({ text: `Page ${currentPage + 1} of ${totalPages} • Total: ${friendsList.length}` });

                const components = totalPages > 1 ? [createButtons(currentPage)] : [];
                await interaction.reply({ embeds: [embed], components });

                if (totalPages > 1) {
                    const filter = (i) => i.user.id === userId;
                    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                    collector.on('collect', async (i) => {
                        if (i.customId === 'previous' && currentPage > 0) {
                            currentPage--;
                        } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                            currentPage++;
                        }

                        const updatedEmbed = await require('../createEmbed.js')(interaction);
                        updatedEmbed.setColor('Blue')
                            .setTitle(`${title} (${filterType.charAt(0).toUpperCase() + filterType.slice(1)})`)
                            .setDescription(createEmbed(currentPage))
                            .setFooter({ text: `Page ${currentPage + 1} of ${totalPages} • Total: ${friendsList.length}` });

                        await i.update({ embeds: [updatedEmbed], components: [createButtons(currentPage)] });
                    });

                    collector.on('end', async () => {
                        try {
                            const disabledRow = createButtons(currentPage);
                            disabledRow.components.forEach((button) => button.setDisabled(true));
                            await interaction.editReply({ components: [disabledRow] });
                        } catch {}
                    });
                }
            } catch (error) {
                console.error('Error fetching friends list:', error);
                return createResponse(interaction, RESPONSES.ERROR('Failed to fetch your friends list.'));
            }
        }

        if (subcommand === 'add') {
            try {
                const friendUser = await findUserByUsername(username);
                if (!friendUser) {
                    return createResponse(interaction, RESPONSES.USER_NOT_FOUND(username));
                }

                const friendId = friendUser.userId;
                const accountId = userId;

                if (accountId === friendId) {
                    return createResponse(interaction, RESPONSES.ERROR('You cannot send a friend request to yourself.'));
                }

                const [senderFriends, receiverFriends] = await Promise.all([
                    ensureFriendsDocument(accountId),
                    ensureFriendsDocument(friendId)
                ]);

                const isAlreadyFriend = senderFriends.list.friends.some(f => f.accountId === friendId);
                if (isAlreadyFriend) {
                    return createResponse(interaction, RESPONSES.ERROR(`You are already friends with \`${username}\`.`));
                }

                const incomingRequestIndex = senderFriends.list.incoming.findIndex(r => r.accountId === friendId);
                
                if (incomingRequestIndex !== -1) {
                    senderFriends.list.incoming.splice(incomingRequestIndex, 1);
                    const outgoingRequestIndex = receiverFriends.list.outgoing.findIndex(r => r.accountId === accountId);
                    if (outgoingRequestIndex !== -1) {
                        receiverFriends.list.outgoing.splice(outgoingRequestIndex, 1);
                    }

                    const senderEntry = createFriendEntry(friendId, 'INBOUND', null, null, false);
                    const receiverEntry = createFriendEntry(accountId, 'OUTBOUND', null, null, false);

                    senderFriends.list.friends.push(senderEntry);
                    receiverFriends.list.friends.push(receiverEntry);

                    await Promise.all([
                        sendToUser(friendId, {
                            type: 'com.epicgames.friends.core.apiobjects.Friend',
                            payload: {
                                accountId: accountId,
                                status: 'ACCEPTED',
                                direction: 'OUTBOUND',
                                created: receiverEntry.created,
                                favorite: false
                            },
                            timestamp: receiverEntry.created
                        }),
                        sendToUser(accountId, {
                            type: 'com.epicgames.friends.core.apiobjects.Friend',
                            payload: {
                                accountId: friendId,
                                status: 'ACCEPTED',
                                direction: 'INBOUND',
                                created: senderEntry.created,
                                favorite: false
                            },
                            timestamp: senderEntry.created
                        }),
                        senderFriends.save(),
                        receiverFriends.save()
                    ]);

                    return createResponse(interaction, RESPONSES.SUCCESS(`You are now friends with \`${username}\`.`));
                } else {
                    const alreadySent = senderFriends.list.outgoing.some(r => r.accountId === friendId);
                    if (alreadySent) {
                        return createResponse(interaction, RESPONSES.ERROR(`You have already sent a friend request to \`${username}\`.`));
                    }

                    const isBlocked = receiverFriends.list.blocklist.some(b => b.accountId === accountId);
                    if (isBlocked) {
                        return createResponse(interaction, RESPONSES.ERROR('Cannot send friend request to this user.'));
                    }

                    if (receiverFriends.settings.acceptInvites === 'private') {
                        return createResponse(interaction, RESPONSES.ERROR(`${username} is not accepting friend requests.`));
                    }

                    const requestEntry = createFriendEntry(friendId, 'PENDING_OUTBOUND');
                    const incomingEntry = createFriendEntry(accountId, 'PENDING_INBOUND');

                    senderFriends.list.outgoing.push(requestEntry);
                    receiverFriends.list.incoming.push(incomingEntry);

                    await Promise.all([
                        sendToUser(friendId, {
                            type: 'com.epicgames.friends.core.apiobjects.Friend',
                            payload: {
                                accountId: accountId,
                                status: 'PENDING',
                                direction: 'INBOUND',
                                created: incomingEntry.created,
                                favorite: false
                            },
                            timestamp: incomingEntry.created
                        }),
                        senderFriends.save(),
                        receiverFriends.save()
                    ]);

                    return createResponse(interaction, RESPONSES.SUCCESS(`Friend request sent to \`${username}\`.`));
                }
            } catch (error) {
                console.error('Error sending friend request:', error);
                return createResponse(interaction, RESPONSES.ERROR('Failed to send friend request.'));
            }
        }

        if (subcommand === 'remove') {
            try {
                const friendUser = await findUserByUsername(username);
                if (!friendUser) {
                    return createResponse(interaction, RESPONSES.USER_NOT_FOUND(username));
                }

                const friendId = friendUser.userId;
                const accountId = userId;

                const [senderFriends, receiverFriends] = await Promise.all([
                    ensureFriendsDocument(accountId),
                    ensureFriendsDocument(friendId)
                ]);

                let actionTaken = false;
                let removalType = null;
                const timestamp = new Date().toISOString();

                const friendIndex = senderFriends.list.friends.findIndex(f => f.accountId === friendId);
                if (friendIndex !== -1) {
                    senderFriends.list.friends.splice(friendIndex, 1);
                    
                    const reciprocalFriendIndex = receiverFriends.list.friends.findIndex(f => f.accountId === accountId);
                    if (reciprocalFriendIndex !== -1) {
                        receiverFriends.list.friends.splice(reciprocalFriendIndex, 1);
                    }
                    actionTaken = true;
                    removalType = 'FRIEND';
                }

                const outgoingIndex = senderFriends.list.outgoing.findIndex(r => r.accountId === friendId);
                if (outgoingIndex !== -1) {
                    senderFriends.list.outgoing.splice(outgoingIndex, 1);
                    
                    const incomingIndex = receiverFriends.list.incoming.findIndex(r => r.accountId === accountId);
                    if (incomingIndex !== -1) {
                        receiverFriends.list.incoming.splice(incomingIndex, 1);
                    }
                    actionTaken = true;
                    removalType = 'FRIEND';
                }

                const incomingIndex = senderFriends.list.incoming.findIndex(r => r.accountId === friendId);
                if (incomingIndex !== -1) {
                    senderFriends.list.incoming.splice(incomingIndex, 1);
                    
                    const senderOutgoingIndex = receiverFriends.list.outgoing.findIndex(r => r.accountId === accountId);
                    if (senderOutgoingIndex !== -1) {
                        receiverFriends.list.outgoing.splice(senderOutgoingIndex, 1);
                    }
                    actionTaken = true;
                    removalType = 'INCOMING_REQUEST';
                }

                if (!actionTaken) {
                    return createResponse(interaction, RESPONSES.ERROR(`No friendship or pending request found with \`${username}\`.`));
                }

                const notificationPromises = [
                    senderFriends.save(),
                    receiverFriends.save()
                ];

                notificationPromises.push(
                    sendToUser(friendId, {
                        type: 'com.epicgames.friends.core.apiobjects.FriendRemoval',
                        payload: {
                            accountId: accountId,
                            reason: 'DELETED'
                        },
                        timestamp: timestamp
                    })
                );

                if (removalType === 'FRIEND') {
                    notificationPromises.push(
                        sendToUser(accountId, {
                            type: 'com.epicgames.friends.core.apiobjects.FriendRemoval',
                            payload: {
                                accountId: friendId,
                                reason: 'DELETED'
                            },
                            timestamp: timestamp
                        })
                    );
                }

                await Promise.all(notificationPromises);

                const actionMessage = removalType === 'FRIEND' ? `Removed \`${username}\` from your friends list.` :
                                    removalType === 'FRIEND' ? `Cancelled friend request to \`${username}\`.` :
                                    `Declined friend request from \`${username}\`.`;

                return createResponse(interaction, RESPONSES.SUCCESS(actionMessage));
            } catch (error) {
                console.error('Error removing friend:', error);
                return createResponse(interaction, RESPONSES.ERROR('Failed to remove friend.'));
            }
        }

        if (subcommand === 'accept') {
            try {
                const friendUser = await findUserByUsername(username);
                if (!friendUser) {
                    return createResponse(interaction, RESPONSES.USER_NOT_FOUND(username));
                }

                const friendId = friendUser.userId;
                const accountId = userId;

                const [senderFriends, receiverFriends] = await Promise.all([
                    ensureFriendsDocument(accountId),
                    ensureFriendsDocument(friendId)
                ]);

                const incomingRequestIndex = senderFriends.list.incoming.findIndex(r => r.accountId === friendId);
                
                if (incomingRequestIndex === -1) {
                    return createResponse(interaction, RESPONSES.ERROR(`No pending friend request from \`${username}\`.`));
                }

                senderFriends.list.incoming.splice(incomingRequestIndex, 1);
                const outgoingRequestIndex = receiverFriends.list.outgoing.findIndex(r => r.accountId === accountId);
                if (outgoingRequestIndex !== -1) {
                    receiverFriends.list.outgoing.splice(outgoingRequestIndex, 1);
                }

                const senderEntry = createFriendEntry(friendId, 'INBOUND', null, null, false);
                const receiverEntry = createFriendEntry(accountId, 'OUTBOUND', null, null, false);

                senderFriends.list.friends.push(senderEntry);
                receiverFriends.list.friends.push(receiverEntry);

                await Promise.all([
                    sendToUser(friendId, {
                        type: 'com.epicgames.friends.core.apiobjects.Friend',
                        payload: {
                            accountId: accountId,
                            status: 'ACCEPTED',
                            direction: 'OUTBOUND',
                            created: receiverEntry.created,
                            favorite: false
                        },
                        timestamp: receiverEntry.created
                    }),
                    sendToUser(accountId, {
                        type: 'com.epicgames.friends.core.apiobjects.Friend',
                        payload: {
                            accountId: friendId,
                            status: 'ACCEPTED',
                            direction: 'INBOUND',
                            created: senderEntry.created,
                            favorite: false
                        },
                        timestamp: senderEntry.created
                    }),
                    senderFriends.save(),
                    receiverFriends.save()
                ]);

                return createResponse(interaction, RESPONSES.SUCCESS(`You are now friends with \`${username}\`.`));
            } catch (error) {
                console.error('Error accepting friend request:', error);
                return createResponse(interaction, RESPONSES.ERROR('Failed to accept friend request.'));
            }
        }

        if (subcommand === 'block') {
            try {
                const friendUser = await findUserByUsername(username);
                if (!friendUser) {
                    return createResponse(interaction, RESPONSES.USER_NOT_FOUND(username));
                }

                const friendId = friendUser.userId;
                const accountId = userId;

                if (accountId === friendId) {
                    return createResponse(interaction, RESPONSES.ERROR('You cannot block yourself.'));
                }

                const friendsDoc = await ensureFriendsDocument(accountId);
                
                const isAlreadyBlocked = friendsDoc.list.blocklist.some(b => b.accountId === friendId);
                if (isAlreadyBlocked) {
                    return createResponse(interaction, RESPONSES.ERROR(`${username} is already blocked.`));
                }

                friendsDoc.list.friends = friendsDoc.list.friends.filter(f => f.accountId !== friendId);
                friendsDoc.list.incoming = friendsDoc.list.incoming.filter(r => r.accountId !== friendId);
                friendsDoc.list.outgoing = friendsDoc.list.outgoing.filter(r => r.accountId !== friendId);

                friendsDoc.list.blocklist.push({
                    accountId: friendId,
                    created: new Date().toISOString()
                });

                await friendsDoc.save();

                return createResponse(interaction, RESPONSES.SUCCESS(`${username} has been blocked.`));
            } catch (error) {
                console.error('Error blocking user:', error);
                return createResponse(interaction, RESPONSES.ERROR('Failed to block user.'));
            }
        }
    },
};