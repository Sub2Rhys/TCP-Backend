const express = require('express');
const app = express.Router();

const { getProfile, handleProfile, shopPurchase, bpPurchase, addItem, modifyCurrency } = require('../functions/profile');
const { itemIdValidator, getItemDetails } = require('../functions/validation');
const { Profile } = require('../../models/mongoose');

app.post('/fortnite/api/game/v2/profile/:accountId/dedicated_server/{*any}', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;

        await Profile.updateOne(
            { userId: accountId },
            {
                $set: { 'profiles.athena.profileChanges.0.profile.updated': new Date().toISOString() },
                $inc: {
                    'profiles.athena.profileRevision': 1,
                    'profiles.athena.profileChanges.0.profile.rvn': 1,
                }
            }
        );

        const profile = await Profile.findOne({ userId: accountId }, 'profiles.athena').lean();
        res.json(profile?.profiles?.athena || {});
    } catch (err) {
        console.error(err.message);
        res.json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/QueryProfile', requireAuth, async (req, res) => {
    const profile = await getProfile({ req, profileId: req.query.profileId, userId: req.user.userId });
    res.json(profile);
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/EquipBattleRoyaleCustomization', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { slotName, indexWithinSlot, itemToSlot, variantUpdates } = req.body;

        const athena = await handleProfile('athena', accountId, ({ attributes, changes }) => {
            const favouriteKey = `favorite_${slotName.toLowerCase().replace('itemwrap', 'itemwraps')}`;

            if (indexWithinSlot === -1) {
                attributes[favouriteKey] = attributes[favouriteKey].map(() => itemToSlot);
            } else if (slotName === "Dance" || slotName === "ItemWrap") {
                if (!Array.isArray(attributes[favouriteKey])) attributes[favouriteKey] = [];
                attributes[favouriteKey][indexWithinSlot] = itemToSlot;
            } else {
                attributes[favouriteKey] = itemToSlot;
            }

            if (Array.isArray(variantUpdates)) {
                const item = changes.items?.[itemToSlot];
                const variantsArr = item?.attributes?.variants;

                if (item && Array.isArray(variantsArr)) {
                    variantUpdates.forEach(({ channel, active }) => {
                        if (!channel || !active) return;
                        const variant = variantsArr.find(v => v.channel === channel);
                        if (!variant) return;
                        if (!variant.owned.includes(active)) return;
                        variant.active = active;
                    });
                }
            }
        });

        res.json(athena);
    } catch (err) {
        console.error('Equip error:', err);
        res.status(500).json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/SetBattleRoyaleBanner', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { homebaseBannerIconId, homebaseBannerColorId } = req.body;

        const athena = await handleProfile('athena', accountId, ({ attributes }) => {
            attributes.banner_icon = homebaseBannerIconId;
            attributes.banner_color = homebaseBannerColorId;
        });

        res.json(athena);
    } catch (err) {
        console.error('SetBattleRoyaleBanner error:', err);
        res.status(500).json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/PurchaseCatalogEntry', requireAuth, async (req, res) => {
    const { offerId } = req.body;

    const offerRegex = /^[A-Z0-9]{32}$/;
    if (offerRegex.test(offerId)) {
        bpPurchase(req, res);
    } else {
        shopPurchase(req, res);
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/GiftCatalogEntry', requireAuth, async (req, res) => {
    const { offerId, receiverAccountIds } = req.body;

    const offerRegex = /^[A-Z0-9]{32}$/;
    if (!offerRegex.test(offerId)) {
        shopPurchase(req, res, receiverAccountIds);
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/RefundMtxPurchase', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { purchaseId } = req.body;

        let purchaseExists = true;

        const common_core = await handleProfile('common_core', accountId, ({ attributes }) => {
            if (attributes.mtx_purchase_history.refundCredits <= 0) {
                purchaseExists = false;
            }
        });

        if (!purchaseExists) {
            return res.json(common_core);
        }

        const athena = await handleProfile('athena', accountId, ({ changes }) => {
            const items = changes.items;
            if (!items[purchaseId]) {
                purchaseExists = false;
            }
            delete items[purchaseId];
        });

        let price = 0;
        let profile = await handleProfile('common_core', accountId, ({ attributes, allChanges }) => {
            attributes.mtx_purchase_history = attributes.mtx_purchase_history ?? {};
        
            attributes.mtx_purchase_history.refundsUsed = (attributes.mtx_purchase_history.refundsUsed ?? 0) + 1;
        
            attributes.mtx_purchase_history.refundCredits = (attributes.mtx_purchase_history.refundCredits ?? 3) - 1;
        
            attributes.mtx_purchase_history.purchases = attributes.mtx_purchase_history.purchases ?? [];
        
            attributes.mtx_purchase_history.purchases = attributes.mtx_purchase_history.purchases.filter(obj => {
                return obj.purchaseId.toLowerCase() !== purchaseId.toLowerCase() &&
                       obj.offerId.toLowerCase() !== purchaseId.toLowerCase();
            });
        
            allChanges.push({
                changeType: "itemRemoved",
                itemId: purchaseId
            });
        });

        if (purchaseExists) {
            profile = await modifyCurrency(accountId, price || 0, 'difference');
        }

        res.json({
            ...profile,
            multiUpdate: [athena]
        });
    } catch (err) {
        console.error('RefundMtxPurchase error:', err);
        res.status(500).json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/MarkItemSeen', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { itemIds } = req.body;

        const athena = await handleProfile('athena', accountId, ({ changes }) => {
            const items = changes.items;
            for (const id of itemIds) {
                if (items[id]?.attributes) items[id].attributes.item_seen = true;
            }
        });

        res.json(athena);
    } catch (err) {
        console.error('MarkItemSeen error:', err);
        res.status(500).json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/SetItemFavoriteStatusBatch', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { itemIds, itemFavStatus } = req.body;

        const athena = await handleProfile('athena', accountId, ({ changes }) => {
            const items = changes.items;
            for (let i = 0; i < itemIds.length; i++) {
                const id = itemIds[i];
                if (items[id]?.attributes) items[id].attributes.favorite = Boolean(itemFavStatus[i]) || false;
            }
        });

        res.json(athena);
    } catch (err) {
        console.error('SetItemFavoriteStatusBatch error:', err);
        res.status(500).json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/ClaimMfaEnabled', requireAuth, async (req, res) => {
    try {
        const athena = await getProfile({ req, profileId: 'athena', userId: req.user.userId });
        const hasMfaReward = athena?.profileChanges?.[0]?.profile?.stats?.attributes?.mfa_reward_claimed || true;

        if (!hasMfaReward) {
            await addItem({ 
                accountId: req.user.userId, 
                message: "lol", 
                items: itemIdValidator('eid_boogiedown'), 
                giftboxId: 'GiftBox:GB_MfaReward', 
                quantity: 1, 
                alert: true
            });

            await handleProfile('athena', validation.userId, ({ attributes }) => {
                attributes.mfa_reward_claimed = true
            });
        }

        const common_core = await getProfile({ req, profileId: 'common_core', userId: req.user.userId });
        res.json(common_core);
    } catch (err) {
        console.error('ClaimMfaEnabled error:', err);
        res.status(500).json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/RemoveGiftBox', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { giftBoxItemId } = req.body;
        const { profileId } = req.query;
        
        const common_core = await handleProfile('common_core', accountId, ({ profile, changes }) => {
            if (changes.items[giftBoxItemId]) {
                delete changes.items[giftBoxItemId];

                profile.profileChanges = profile.profileChanges.filter(item => {
                    return item?.itemId !== giftBoxItemId;
                });
            }
        });
        
        const response = JSON.parse(JSON.stringify(common_core).replace(/common_core/g, profileId));
        res.json(response);
    } catch (err) {
        console.error('RemoveGiftBox error:', err);
        res.status(500).json({});
    }
});

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/CreateOrUpgradeOutpostItem', requireAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { profileId } = req.query;

        const common_core = await handleProfile('common_core', accountId, ({ changes }) => {
            changes.items["Outpost:outpostcore_pve_01"] = {
                "templateId": "Outpost:outpostcore_pve_01",
                "attributes": {
                    "cloud_save_info": {
                        "saveCount": 851,
                        "savedRecords": [{
                            "recordIndex": 0,
                            "archiveNumber": 0,
                            "recordFilename": "a1d68ce6-63a5-499a-946f-9e0c825572d7_r0_a0.sav"
                        }]
                    },
                    "level": 10,
                    "outpost_core_info": {
                        "placedBuildings": [{
                                "buildingTag": "Outpost.BuildingActor.Building.00",
                                "placedTag": "Outpost.PlacementActor.Placement.00"
                            },
                            {
                                "buildingTag": "Outpost.BuildingActor.Building.01",
                                "placedTag": "Outpost.PlacementActor.Placement.02"
                            },
                            {
                                "buildingTag": "Outpost.BuildingActor.Building.02",
                                "placedTag": "Outpost.PlacementActor.Placement.01"
                            },
                            {
                                "buildingTag": "Outpost.BuildingActor.Building.03",
                                "placedTag": "Outpost.PlacementActor.Placement.05"
                            }
                        ],
                        "accountsWithEditPermission": [],
                        "highestEnduranceWaveReached": 30
                    }
                },
                "quantity": 1
            }
        });

        const response = JSON.parse(JSON.stringify(common_core).replace(/common_core/g, profileId));
        res.json(response);
    } catch (err) {
        console.error('CreateOrUpgradeOutpostItem error:', err);
        res.status(500).json({});
    }
});

const endpoints = [
    'GetMcpTimeForLogin',
    'SetMtxPlatform',
    'MarkNewQuestNotificationSent',
    'ClientQuestLogin',
    'IncrementNamedCounterStat',
    'RefreshExpeditions',
    'BulkEquipBattleRoyaleCustomization',
    'ClaimLoginReward',
    'IssueFriendCode',
];

app.post('/fortnite/api/game/v2/profile/:accountId/{*any}/:action', requireAuth, (req, res, next) => {
    const { action } = req.params;

    if (endpoints.includes(action)) {
        return res.json({});
    }

    next();
});

module.exports = app;