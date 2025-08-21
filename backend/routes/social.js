const express = require('express');
const app = express.Router();

const { User, Friends } = require('../../models/mongoose');
const { sendToUser } = require('../xmpp/xmpp');

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

app.get('/friends/api/public/friends/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        
        const user = await User.findOne({ userId: accountId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const friendsDoc = await ensureFriendsDocument(accountId);
        const allFriends = [];

        for (const friend of friendsDoc.list.friends) {
            allFriends.push({
                accountId: friend.accountId,
                status: 'ACCEPTED',
                direction: friend.direction || 'OUTBOUND',
                alias: friend.alias || undefined,
                note: friend.note || undefined,
                created: friend.created,
                favorite: friend.favorite || false
            });
        }

        for (const request of friendsDoc.list.incoming) {
            allFriends.push({
                accountId: request.accountId,
                status: 'PENDING',
                direction: 'INBOUND',
                created: request.created,
                favorite: false
            });
        }

        for (const request of friendsDoc.list.outgoing) {
            allFriends.push({
                accountId: request.accountId,
                status: 'PENDING',
                direction: 'OUTBOUND',
                created: request.created,
                favorite: false
            });
        }

        const cleanedFriends = allFriends.map(friend => {
            const cleaned = { ...friend };
            Object.keys(cleaned).forEach(key => {
                if (cleaned[key] === undefined) {
                    delete cleaned[key];
                }
            });
            return cleaned;
        });

        res.json(cleanedFriends);
    } catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/friends/api/public/friends/:accountId/:friendId', async (req, res) => {
    try {
        const { accountId, friendId } = req.params;

        const [user, friendUser] = await Promise.all([
            User.findOne({ userId: accountId }),
            User.findOne({ userId: friendId })
        ]);

        if (!user || !friendUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (accountId === friendId) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        const [senderFriends, receiverFriends] = await Promise.all([
            ensureFriendsDocument(accountId),
            ensureFriendsDocument(friendId)
        ]);

        const isAlreadyFriend = senderFriends.list.friends.some(f => f.accountId === friendId);
        if (isAlreadyFriend) {
            return res.status(400).json({ error: 'Already friends' });
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
        } else {
            const alreadySent = senderFriends.list.outgoing.some(r => r.accountId === friendId);
            if (alreadySent) {
                return res.status(400).json({ error: 'Friend request already sent' });
            }

            const isBlocked = receiverFriends.list.blocklist.some(b => b.accountId === accountId);
            if (isBlocked) {
                return res.status(403).json({ error: 'Cannot send friend request' });
            }

            if (receiverFriends.settings.acceptInvites === 'private') {
                return res.status(403).json({ error: 'User is not accepting friend requests' });
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
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error processing friend request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/friends/api/public/friends/:accountId/:friendId', async (req, res) => {
    try {
        const { accountId, friendId } = req.params;

        const [user, friendUser] = await Promise.all([
            User.findOne({ userId: accountId }),
            User.findOne({ userId: friendId })
        ]);

        if (!user || !friendUser) {
            return res.status(404).json({ error: 'User not found' });
        }

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
            return res.status(404).json({ error: 'No friendship or pending request found' });
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
                    reason: removalType === 'FRIEND' ? 'DELETED' : 'DELETED'
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
        res.status(204).send();
    } catch (error) {
        console.error('Error removing friend/request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/friends/api/public/friends/:accountId/:friendId/status', async (req, res) => {
    try {
        const { accountId, friendId } = req.params;
        
        const friendsDoc = await ensureFriendsDocument(accountId);
        
        const friend = friendsDoc.list.friends.find(f => f.accountId === friendId);
        if (friend) {
            return res.json({ status: 'ACCEPTED', direction: friend.direction });
        }

        const outgoing = friendsDoc.list.outgoing.find(r => r.accountId === friendId);
        if (outgoing) {
            return res.json({ status: 'PENDING', direction: 'OUTBOUND' });
        }

        const incoming = friendsDoc.list.incoming.find(r => r.accountId === friendId);
        if (incoming) {
            return res.json({ status: 'PENDING', direction: 'INBOUND' });
        }

        const blocked = friendsDoc.list.blocklist.find(b => b.accountId === friendId);
        if (blocked) {
            return res.json({ status: 'BLOCKED' });
        }

        res.json({ status: 'NONE' });
    } catch (error) {
        console.error('Error checking friendship status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/friends/api/public/friends/:accountId/:friendId', async (req, res) => {
    try {
        const { accountId, friendId } = req.params;
        const { alias, note, favorite } = req.body;

        const friendsDoc = await ensureFriendsDocument(accountId);
        const friendIndex = friendsDoc.list.friends.findIndex(f => f.accountId === friendId);
        
        if (friendIndex === -1) {
            return res.status(404).json({ error: 'Friend not found' });
        }

        if (alias !== undefined) friendsDoc.list.friends[friendIndex].alias = alias;
        if (note !== undefined) friendsDoc.list.friends[friendIndex].note = note;
        if (favorite !== undefined) friendsDoc.list.friends[friendIndex].favorite = favorite;

        await friendsDoc.save();
        res.status(204).send();
    } catch (error) {
        console.error('Error updating friend:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get(['/account/api/public/account/displayName/:displayName', '/persona/api/public/account/lookup'], async (req, res) => {
    const { q } = req.query;
    const user = await User.findOne({ displayName: { $regex: new RegExp(`^${req.params?.displayName || q}$`, 'i') } });
    if (!user) {
        return res.status(404).send();
    }

    res.json({
        id: user?.userId,
        displayName: user.displayName,
        externalAuths: {}
    });
});

app.get('/account/api/public/account', async (req, res) => {
    let users = req.query.accountId;
    if (!users) {
        return res.json([]);
    }

    if (typeof users == 'string') {
        users = [users];
    }

    const usersList = [];

    for (const userId of users) {
        const user = await User.findOne({ userId });
        if (!user) continue;

        usersList.push({
            "id": user?.userId,
            "displayName": user.displayName,
            "links": {},
            "minorVerified": false,
            "minorStatus": "NOT_MINOR",
            "cabinedMode": false,
            "lastReviewedSecuritySettings": "9999-12-31T23:59:59.999Z",
            "lastDeclinedMFASetup": "9999-12-31T23:59:59.999Z",
            "externalAuths": {}
        });
    }

    res.json(usersList);
});

app.get('/friends/api/public/blocklist/:accountId', async (req, res) => {
    const friends = await Friends.findOne({ userId: req.user?.userId });
    res.json({ blockedUsers: friends?.list?.blocklist });
});

app.get('/friends/api/public/list/fortnite/:accountId/recentPlayers', async (req, res) => {
    res.json({ recentPlayers: {} });
});

app.get('/fortnite/api/game/v2/friendcodes/{*any}/epic', async (req, res) => {
    res.json([]);
});

module.exports = app;