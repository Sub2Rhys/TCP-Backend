const fs = require('fs').promises;
const path = require('path');

const { Profile, User } = require('../../models/mongoose');
const { generateId } = require('./misc');
const { sendToUser } = require('../xmpp/xmpp');

const getFutureDate = (days = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
};

async function getProfile({ req, profileId, userId }) {
    let profile = await Profile.findOne({ userId });
    if (!profile) return {};
    
    let isComplete = req.cl <= 3532353 ? '/complete' : '';

    async function fallback() {
        const filePath = `./backend/jsons/profiles${isComplete}/${profileId}.json`;
        if (profileId == 'profile0') {
            const common_core = JSON.stringify(profile.profiles['common_core']);
            if (!common_core) {
                profile = {};
                return;
            }
            return JSON.parse(
                common_core
                    .replace(/common_core/g, 'profile0')
                    .replace(/USER_ID/g, userId)
            );
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent.replace(/USER_ID/g, userId));
    }

    if (req.cl <= 3532353) {
        profile = fallback();
    } else {
        switch (profileId) {
            case 'athena':
            case 'common_core':
                profile = profile.profiles[profileId];
                break;

            case 'profile0': {
                const common_core = JSON.stringify(profile.profiles['common_core']);
                if (!common_core) {
                    profile = {};
                    break;
                }
                profile = JSON.parse(
                    common_core
                        .replace(/common_core/g, 'profile0')
                        .replace(/USER_ID/g, userId)
                );
                break;
            }

            default:
                if (!profile.profiles[profileId]) {
                    profile = fallback();
                } else {
                    profile = profile.profiles[profileId];
                }
                break;
        }
    }

    return profile;
}

async function modifyCurrency(accountId, amount, mode = 'set') {
    try {
        const profile = await Profile.findOne({ userId: accountId });
        if (!profile) return;

        const common_core = profile.profiles?.common_core;
        const changes = common_core?.profileChanges?.[0]?.profile;
        const items = changes?.items;

        if (!common_core || !changes || !items || isNaN(amount)) return;

        const currentQuantity = items['Currency:MtxPurchased'].quantity;

        switch (mode) {
            case 'set':
                if (amount < 0) {
                    return;
                }
                items['Currency:MtxPurchased'].quantity = amount;
                break;

            case 'difference':
                const newQuantity = currentQuantity + amount;
                if (newQuantity < 0) {
                    return;
                }
                items['Currency:MtxPurchased'].quantity = newQuantity;
                break;

            default:
                return;
        }

        changes.updated = new Date().toISOString();
        common_core.profileRevision += 1;
        changes.rvn += 1;

        common_core.profileChanges.push({
            changeType: "itemQuantityChanged",
            itemId: "Currency:MtxPurchased",
            quantity: items['Currency:MtxPurchased'].quantity
        });

        void Profile.updateOne(
            { userId: accountId },
            { $set: { 'profiles.common_core': common_core } }
        ).catch(err => console.error(err));

        return common_core;
    } catch (err) {
        console.error('Currency error:', err);
        return;
    }
}

async function createGiftBox({ items, message = 'Thanks for playing Fortnite!', toAccountId, fromAccountId = 'Administrator', giftboxId = 'GiftBox:gb_makegood', save = false }) {
    try {
        const jsonPath = path.join(__dirname, '../jsons/profiles/complete/athena.json');
        const athenaData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
        const allItems = athenaData?.profileChanges?.[0]?.profile?.items;

        const multiUpdate = [];
        const lootList = [];

        if (typeof items === 'string') {
            items = { [items]: 1 };
        }

        if (Array.isArray(items)) {
            const itemsObj = {};
            items.forEach(item => {
                if (typeof item === 'string') {
                    itemsObj[item] = 1;
                } else if (typeof item === 'object' && item.id) {
                    itemsObj[item.id] = item.quantity || 1;
                }
            });
            items = itemsObj;
        }

        for (const [offerId, itemQuantity] of Object.entries(items)) {
            let cosmetic;

            if (!offerId.toLowerCase().startsWith('athena:')) {
                cosmetic = {
                    "templateId": offerId,
                    "attributes": {
                        "item_seen": true
                    },
                    "quantity": 1
                }
            } else {
                cosmetic = allItems[offerId];

                if (!cosmetic && offerId.includes(':')) {
                    const suffix = offerId.split(':').slice(1).join(':').toLowerCase();
                    for (const key in allItems) {
                        if (key.endsWith(suffix)) {
                            cosmetic = allItems[key];
                            break;
                        }
                    }
                }
            }

            if (!cosmetic) {
                console.log(`Item not found: ${offerId}`);
                continue;
            }

            lootList.push({
                "itemType": cosmetic.templateId,
                "itemGuid": cosmetic.templateId,
                "quantity": itemQuantity
            });

            multiUpdate.push({
                changeType: "itemAdded",
                itemId: cosmetic.templateId,
                templateId: cosmetic.templateId
            });
        }

        if (lootList.length === 0) {
            console.log('No valid items to add to giftbox');
            return;
        }
        
        const profileChanges = [];
        const giftboxItems = {};

        const id = generateId();
        
        giftboxItems[id] = {
            "templateId": giftboxId,
            "attributes": {
                "fromAccountId": fromAccountId,
                "lootList": lootList,
                "params": {
                    "userMessage": message
                },
                "giftedOn": new Date().toISOString()
            },
            "quantity": 1
        };
    
        lootList.forEach(item => {
            profileChanges.push({
                changeType: "itemAdded",
                itemId: item.itemGuid,
                templateId: item.itemType
            });

            multiUpdate.push({
                changeType: "itemAdded",
                itemId: item.itemGuid,
                templateId: item.itemType
            });
        });
    
        profileChanges.push({
            changeType: "itemAdded",
            itemId: id,
            templateId: giftboxId
        });

        multiUpdate.push({
            changeType: "itemAdded",
            itemId: id,
            templateId: giftboxId
        });

        if (save) {
            const profile = await Profile.findOne({ userId: toAccountId });
            if (!profile) return;
        
            const common_core = profile.profiles?.common_core;
            if (!common_core) return;
        
            Object.assign(common_core.profileChanges[0].profile.items, giftboxItems);
        
            common_core.profileChanges[0].profileChanges = common_core.profileChanges[0].profileChanges || [];
            common_core.profileChanges[0].profileChanges.push(...multiUpdate);
        
            await Profile.updateOne(
                { userId: toAccountId },
                { 
                    $set: { 
                        'profiles.common_core': common_core 
                    } 
                }
            ).catch(console.error);
        
            return;
        }

        return { 
            profileChanges, 
            items: giftboxItems,
            giftboxId: id
        };
    } catch (err) {
        console.error('Giftbox creation error:', err);
        return;
    }
}

async function addItem({ accountId, items, message, quantity = 1, giftboxId, alert = false, sender }) {
    try {
        const profile = await Profile.findOne({ userId: accountId });
        if (!profile) return;

        const athena = profile.profiles?.athena;
        const common_core = profile.profiles?.common_core;
        const changes = athena?.profileChanges?.[0]?.profile;
        const ccChanges = common_core?.profileChanges?.[0]?.profile;
        const profileItems = changes?.items;
        const ccItems = ccChanges?.items;

        if (!athena || !common_core || !changes || !ccChanges || !profileItems || !ccItems) return;

        const jsonPath = path.join(__dirname, '../jsons/profiles/complete/athena.json');
        const athenaData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
        const allItems = athenaData?.profileChanges?.[0]?.profile?.items;

        if (typeof items === 'string') {
            items = { [items]: quantity };
        }

        if (Array.isArray(items)) {
            const itemsObj = {};
            items.forEach(item => {
                if (typeof item === 'string') {
                    itemsObj[item] = quantity;
                } else if (typeof item === 'object' && item.id) {
                    itemsObj[item.id] = item.quantity || quantity;
                }
            });
            items = itemsObj;
        }

        for (const [offerId, itemQuantity] of Object.entries(items)) {
            let cosmetic = allItems[offerId];

            if (!offerId?.toLowerCase().startsWith('athena')) {
                cosmetic = {
                    "templateId": offerId,
                    "attributes": {
                        "item_seen": true
                    },
                    "quantity": 1
                }
            } else if (!cosmetic && offerId.includes(':')) {
                const suffix = offerId.split(':').slice(1).join(':').toLowerCase();
                for (const key in allItems) {
                    if (key.endsWith(suffix)) {
                        cosmetic = allItems[key];
                        break;
                    }
                }
            }

            if (!cosmetic) {
                console.log(`Item not found: ${offerId}`);
                continue;
            }

            const itemToAdd = JSON.parse(JSON.stringify(cosmetic));
            itemToAdd.attributes.item_seen = false;
            itemToAdd.quantity = itemQuantity;

            profileItems[offerId] = itemToAdd;
        }

        if (alert) {
            const giftboxData = await createGiftBox({ items, toAccountId: accountId, fromAccountId: sender, giftboxId, message });
            if (giftboxData) {
                Object.assign(ccItems, giftboxData.items);

                common_core.profileChanges.push(...giftboxData.profileChanges);

                ccChanges.updated = new Date().toISOString();
                common_core.profileRevision += 1;
                ccChanges.rvn += 1;
            }
        }

        changes.updated = new Date().toISOString();
        athena.profileRevision += 1;
        changes.rvn += 1;

        await Profile.updateOne(
            { userId: accountId },
            { 
                $set: { 
                    'profiles.athena': athena,
                    'profiles.common_core': common_core 
                } 
            }
        ).catch(console.error);

        return athena;
    } catch (err) {
        console.error('Athena modification error:', err);
        return;
    }
}

async function handleProfile(profileId, accountId, updateCallback) {
    const userProfile = await Profile.findOne({ userId: { $regex: `^${accountId}$`, $options: 'i' } });
    if (!userProfile) throw new Error('Profile not found');

    const profile = userProfile.profiles?.[profileId];
    const allChanges = profile?.profileChanges
    const changes = allChanges?.[0]?.profile;
    const attributes = changes?.stats?.attributes;

    if (!profile || !changes || !attributes) throw new Error('Malformed profile structure');

    await updateCallback({ profile, changes, attributes, userProfile, allChanges });

    changes.updated = new Date().toISOString();
    changes.rvn += 1;
    profile.profileRevision += 1;
    profile.serverTime = new Date().toISOString();

    await Profile.updateOne(
        { userId: accountId },
        { $set: { [`profiles.${profileId}`]: profile } }
    );

    return profile;
}

async function shopPurchase(req, res, recipients = []) {
    try {
        const { accountId } = req.params;
        const { expectedTotalPrice, expectedPrice, offerId, purchaseQuantity, giftWrapTemplateId, personalMessage } = req.body;
        const profileId = req.query.profileId;

        let price = expectedTotalPrice || expectedPrice;

        const common_core = await modifyCurrency(accountId, -price, 'difference');
        if (!common_core) return res.status(500).json({ error: 'Failed to modify currency.' });

        if (recipients.length > 0) {
            for (const receiverId of recipients) {
                const user = await User.findOne({ userId: accountId });

                await addItem({ accountId: receiverId, items: offerId, alert: true, giftboxId: giftWrapTemplateId, message: personalMessage, sender: user?.displayName || accountId });

                sendToUser(receiverId, {
                    type: "com.epicgames.gift.received",
                    payload: {},
                    timestamp: new Date().toISOString()
                });
            }

            return res.json(common_core);
        }

        const athena = await addItem({ accountId, items: offerId });

        let profile = await handleProfile('common_core', accountId, ({ attributes }) => {
            attributes.mtx_purchase_history.purchases.push({
                purchaseId: offerId,
                offerId,
                purchaseDate: new Date().toISOString(),
                undoTimeout: getFutureDate(30),
                freeRefundEligible: true,
                fulfillments: [],
                lootResult: [{
                    itemType: offerId,
                    itemGuid: offerId,
                    itemProfile: profileId,
                    quantity: purchaseQuantity
                }],
                totalMtxPaid: price,
                metadata: {},
                gameContext: ""
            });
        });

        profile = JSON.parse(JSON.stringify(profile).replace(/common_core/g, profileId));

        res.json({
            ...profile,
            multiUpdate: [athena]
        });
    } catch (err) {
        console.error('Shop purchase error:', err);
        res.status(500).json({});
    }
}

const passes = [
    {
        "seasonId": "Season2",
        "battlePassOfferId": "C3BA14F04F4D56FC1D490F8011B56553",
        "tierOfferId": "F86AC2ED4B3EA4B2D65EF1B2629572A0"
    },
    {
        "seasonId": "Season3",
        "battleBundleOfferId": "70487F4C4673CC98F2FEBEBB26505F44",
        "battlePassOfferId": "2331626809474871A3A44C47C1D8742E",
        "tierOfferId": "E2D7975EFEC54A45900D8D9A6D9D273C",
    },
    {
        "seasonId": "Season4",
        "battleBundleOfferId": "884CE68998C44AC58D85C5A9883DE1A6",
        "battlePassOfferId": "76EA7FE9787744B09B79FF3FC5E39D0C",
        "tierOfferId": "E9527AF46F4B4A9CAE98D91F2AA53CB6",
    },
    {
        "seasonId": "Season5",
        "battleBundleOfferId": "FF77356F424644529049280AFC8A795E",
        "battlePassOfferId": "D51A2F28AAF843C0B208F14197FBFE91",
        "tierOfferId": "4B2E310BC1AE40B292A16D5AAD747E0A",
    },
    {
        "seasonId": "Season6",
        "battleBundleOfferId": "19D4A5ACC90B4CDF88766A0C8A6D13FB",
        "battlePassOfferId": "9C8D0323775A4F59A1D4283E3FDB356C",
        "tierOfferId": "A6FE59C497B844068E1B5D84396F19BA",
    },
    {
        "seasonId": "Season7",
        "battleBundleOfferId": "347A90158C64424980E8C1B3DC088F37",
        "battlePassOfferId": "3A3C99847F144AF3A030DB5690477F5A",
        "tierOfferId": "64A3020B098841A7805EE257D68C554F",
    },
    {
        "seasonId": "Season8",
        "battleBundleOfferId": "18D9DA48000A40BFAEBAC55A99C55221",
        "battlePassOfferId": "77F31B7F83FB422195DA60CDE683671D",
        "tierOfferId": "E07E41D52D4A425F8DC6592496B75301",
    },
    {
        "seasonId": "Season9",
        "battleBundleOfferId": "C7190ACA4E5E228A94CA3CB9C3FC7AE9",
        "battlePassOfferId": "73E6EE6F4526EF97450D1592C3DB0EF5",
        "tierOfferId": "33E185A84ED7B64F2856E69AADFD092C",
    },
    {
        "seasonId": "Season10",
        "battleBundleOfferId": "259920BC42F0AAC7C8672D856C9B622C",
        "battlePassOfferId": "2E43CCD24C3BE8F5ABBDF28E233B9350",
        "tierOfferId": "AF1B7AC14A5F6A9ED255B88902120757",
    },
];

async function bpPurchase(req, res) {
    try {
        const { accountId } = req.params;
        const { expectedTotalPrice, expectedPrice, offerId, purchaseQuantity } = req.body;
        const profileId = req.query.profileId;

        let price = expectedTotalPrice || expectedPrice;

        const userProfile = await Profile.findOne({ userId: accountId });
        if (!userProfile) return res.status(500).json({ error: 'Profile not found' });

        let matchedPass = null;
        let offerType = null;

        for (const pass of passes) {
            if (offerId === pass.battlePassOfferId) {
                matchedPass = pass;
                offerType = 'battlepass';
                break;
            } else if (offerId === pass.tierOfferId) {
                matchedPass = pass;
                offerType = 'tier';
                break;
            } else if (offerId === pass.battleBundleOfferId) {
                matchedPass = pass;
                offerType = 'bundle';
                break;
            }
        }

        if (!matchedPass) {
            return res.status(400).json({ error: 'Offer not found in battle pass configuration' });
        }

        const season = matchedPass.seasonId;
        const seasonJson = path.join(__dirname, `../jsons/battlepass/${season}.json`);
        const seasonData = JSON.parse(await fs.readFile(seasonJson, 'utf-8'));

        const jsonPath = path.join(__dirname, '../jsons/profiles/complete/athena.json');
        const athenaData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
        const allItems = athenaData?.profileChanges?.[0]?.profile?.items;

        const common_core = userProfile.profiles.common_core;
        const athena = userProfile.profiles.athena;
        const ccChanges = common_core?.profileChanges?.[0]?.profile;
        const athenaChanges = athena?.profileChanges?.[0]?.profile;
        const ccItems = ccChanges?.items;
        const athenaItems = athenaChanges?.items;

        if (!common_core || !athena || !ccChanges || !athenaChanges || !ccItems || !athenaItems) {
            return res.status(500).json({ error: 'Malformed profile structure' });
        }

        const currentVbucks = ccItems['Currency:MtxPurchased']?.quantity || 0;
        if (currentVbucks < price) {
            return res.status(400).json({
                errorMessage: `Cannot afford purchase ${offerId}`,
                errorCode: 'errors.com.epicgames.modules.gamesubcatalog.cannot_afford_purchase'
            });
        }

        let previousLevel = athenaChanges.stats.attributes.book_level || 0;
        let wasPurchased = athenaChanges.stats.attributes.book_purchased || false;
        let newLevel = previousLevel;
        let newPurchased = wasPurchased;
        let currentSeason = parseInt(season.replace('Season', ''));

        if (athenaChanges.stats.attributes.season_num === currentSeason && wasPurchased && offerType === 'battlepass') {
            return res.status(204).end();
        }

        if (athenaChanges.stats.attributes.season_num === currentSeason && wasPurchased && offerType === 'bundle' && newLevel >= 75) {
            return res.status(204).end();
        }

        if (athenaChanges.stats.attributes.season_num !== currentSeason) {
            athenaChanges.stats.attributes.season_num = currentSeason;
            athenaChanges.stats.attributes.book_level = 1;
            newLevel = previousLevel = 1;
        }

        switch (offerType) {
            case 'battlepass':
                newPurchased = true;
                newLevel = Math.max(1, previousLevel);
                break;
            case 'tier':
                newLevel += purchaseQuantity;
                newPurchased = true;
                break;
            case 'bundle':
                newPurchased = true;
                newLevel += 25;
                break;
        }

        let startTier, endTier;
            
        if (offerType === 'battlepass' && !wasPurchased) {
            startTier = 1;
            endTier = newLevel;
        } else if (offerType === 'bundle' && !wasPurchased) {
            startTier = 1;
            endTier = newLevel;
        } else if (offerType === 'bundle' && wasPurchased) {
            startTier = previousLevel + 1;
            endTier = newLevel;
        } else {
            startTier = previousLevel + 1;
            endTier = newLevel;
        }

        let totalVbucks = 0;
        const rewardedItems = {};

        const applyRewards = (rewardData, tierIndex) => {
            const reward = rewardData[tierIndex];
            if (!reward) return;

            for (const [itemId, quantity] of Object.entries(reward)) {
                if (itemId.startsWith('Currency:')) {
                    totalVbucks += quantity;
                    rewardedItems[itemId] = quantity;
                    continue;
                }
                let cosmetic = allItems[itemId];
                if (!cosmetic && itemId.includes(':')) {
                    const suffix = itemId.split(':').slice(1).join(':').toLowerCase();
                    cosmetic = Object.entries(allItems).find(([key]) => key.endsWith(suffix))?.[1];
                }
                if (cosmetic) {
                    const itemToAdd = { ...cosmetic, attributes: { ...cosmetic.attributes, item_seen: false }, quantity };
                    athenaItems[itemId] = itemToAdd;

                    rewardedItems[itemId] = quantity;
                } else {
                    rewardedItems[itemId] = quantity;
                    continue;
                }
            }
        };

        if (startTier <= 2) {
            startTier -= 1;
        }

        for (let tier = startTier; tier <= endTier; tier++) {
            const tierIndex = tier - 1;
            applyRewards(seasonData.freeRewards, tierIndex);
            if (newPurchased) applyRewards(seasonData.paidRewards, tierIndex);
        }

        if (Object.keys(rewardedItems).length > 0 && req.cl > 3889387) {
            const giftboxData = await createGiftBox({ items: rewardedItems, giftboxId: newLevel <= 1 ? 'GiftBox:gb_battlepasspurchased' : 'GiftBox:gb_battlepass', toAccountId: accountId });
            
            if (giftboxData) {
                Object.assign(ccItems, giftboxData.items);
                common_core.profileChanges.push(...giftboxData.profileChanges);
            }
        }

        const newVbuckBalance = currentVbucks - price + totalVbucks;
        ccItems['Currency:MtxPurchased'].quantity = newVbuckBalance;

        common_core.profileChanges.push({
            changeType: "itemQuantityChanged",
            itemId: "Currency:MtxPurchased",
            quantity: newVbuckBalance
        });

        athenaChanges.stats.attributes.book_level = newLevel;
        athenaChanges.stats.attributes.book_purchased = newPurchased;

        if (currentSeason == 2 && newLevel > 70) {
            athenaChanges.stats.attributes.book_level = 70;
        } else if (currentSeason >= 3 && newLevel > 100) {
            athenaChanges.stats.attributes.book_level = 100;
        }

        const timestamp = new Date().toISOString();

        for (const change of [ccChanges, athenaChanges]) {
            change.updated = timestamp;
            change.rvn += 1;
        }

        for (const prof of [common_core, athena]) {
            prof.profileRevision += 1;
        }
        athena.serverTime = timestamp;

        await Profile.updateOne(
            { userId: accountId },
            {
                $set: {
                    'profiles.common_core': common_core,
                    'profiles.athena': athena
                }
            }
        );

        const profile = JSON.parse(JSON.stringify(common_core).replace(/common_core/g, profileId));

        res.json({
            ...profile,
            multiUpdate: [athena]
        });
    } catch (err) {
        console.error('Battlepass purchase error:', err);
        res.status(500).json({});
    }
}

module.exports = {
    getProfile,
    modifyCurrency,
    addItem,
    handleProfile,
    shopPurchase,
    bpPurchase,
    createGiftBox
};