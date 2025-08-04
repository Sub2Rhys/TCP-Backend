const express = require('express');
const fs = require('node:fs');
const path = require('path');
const app = express.Router();

const config = require('../../config.json');
const { displayAssetValidator, itemIdValidator } = require('../functions/validation');

const base_dir = path.join(__dirname, '../../backend/jsons');
const paths = {
    template: path.join(base_dir, 'storefront_template.json'),
    cosmetics: path.join(base_dir, '/cosmetics/cosmetics.json'),
    storefront: path.join(base_dir, 'storefront.json'),
    storefront_safe: path.join(base_dir, 'storefront_safe.json'),
};

const getFutureDate = (days = 0) => {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    d.setTime(d.getTime() - 60000);
    d.setDate(d.getDate() + days);
    return d.toISOString();
};

async function generateShop() {
    try {
        const version = config?.backend?.season || 1;
        const template = JSON.parse(fs.readFileSync(paths.template, 'utf-8'));
        let { items } = JSON.parse(fs.readFileSync(paths.cosmetics, 'utf-8'));

        items = items.filter(i =>
            !i.id?.toLowerCase().includes('banner') &&
            String(i.type?.id).toLowerCase() !== 'athenabackpack'
        );
        if (!config?.item_shop?.allow_any_cosmetic)
            items = items.filter(i => i.gameplayTags?.some(t => t.toLowerCase().includes('source.itemshop')));

        const filtered = items.filter(i => {
            const v = parseFloat(i.added?.version?.replace('1.11', '2.00'));
            const target = parseFloat(version?.toString().replace('1.11', '2.00'));
            return v <= target && v >= 1;
        });

        const weeklyPool = filtered.filter(i =>
            String(i.type?.id).toLowerCase() !== 'emote' &&
            !['common', 'uncommon', 'rare'].includes(String(i.rarity?.id).toLowerCase())
        );

        let weekly = [];
        while (weekly.length < 2) {
            const candidate = weeklyPool[Math.floor(Math.random() * weeklyPool.length)];
            if (weekly.includes(candidate)) continue;

            if (weekly.length === 0) {
                weekly.push(candidate);
            } else {
                const existing = weekly[0];
                const type1 = String(existing.type?.id).toLowerCase();
                const type2 = String(candidate.type?.id).toLowerCase();
                if (type1 === type2 && type1 !== 'outfit') continue;
                weekly.push(candidate);
            }
        }

        const dailyPool = filtered.filter(i => {
            const isInWeekly = weekly.includes(i);
            const isSkin = String(i.type?.id).toLowerCase() === 'outfit';
            const isEpicOrLegendary = ['epic', 'legendary'].includes(String(i.rarity?.id).toLowerCase());
            return !isInWeekly && !(isSkin && isEpicOrLegendary);
        });

        const typeBuckets = {
            outfit: [],
            emote: [],
            pickaxe: [],
            glider: [],
            other: []
        };

        for (const item of dailyPool) {
            const type = String(item.type?.id).toLowerCase();
            if (typeBuckets[type]) {
                typeBuckets[type].push(item);
            } else {
                typeBuckets.other.push(item);
            }
        }

        const getRandomFrom = arr => arr[Math.floor(Math.random() * arr.length)];

        const daily = [];

        ['outfit', 'emote', 'pickaxe', 'glider'].forEach(type => {
            const bucket = typeBuckets[type];
            if (bucket.length > 0) {
                const choice = getRandomFrom(bucket);
                daily.push(choice);
                Object.values(typeBuckets).forEach(b => {
                    const i = b.indexOf(choice);
                    if (i !== -1) b.splice(i, 1);
                });
            } else {
                const fallbackPool = Object.values(typeBuckets).flat();
                if (fallbackPool.length > 0) {
                    const fallback = getRandomFrom(fallbackPool);
                    daily.push(fallback);
                    Object.values(typeBuckets).forEach(b => {
                        const i = b.indexOf(fallback);
                        if (i !== -1) b.splice(i, 1);
                    });
                }
            }
        });

        const remainingPool = Object.values(typeBuckets).flat();
        while (daily.length < 6 && remainingPool.length > 0) {
            const choice = getRandomFrom(remainingPool);
            if (!daily.includes(choice)) {
                daily.push(choice);
                const idx = remainingPool.indexOf(choice);
                if (idx !== -1) remainingPool.splice(idx, 1);
            }
        }

        const futureDate = getFutureDate();

        const makeWeeklyEntry = item => ({
            devName: `[VIRTUAL]1 x ${item?.name} for ${item?.price} MtxCurrency`,
            offerId: itemIdValidator(item.id, item.type?.id),
            fulfillmentIds: [],
            dailyLimit: -1,
            weeklyLimit: -1,
            monthlyLimit: -1,
            categories: [],
            prices: [{
                currencyType: "MtxCurrency",
                currencySubType: "",
                regularPrice: item?.price || 2000,
                finalPrice: item?.price || 2000,
                saleExpiration: futureDate,
                basePrice: item?.price || 2000
            }],
            meta: {
                SectionId: "Featured",
                TileSize: "Normal"
            },
            matchFilter: "",
            filterWeight: 0,
            appStoreId: [],
            requirements: [],
            offerType: "StaticPrice",
            giftInfo: {
                bIsEnabled: true,
                forcedGiftBoxTemplateId: "",
                purchaseRequirements: [],
                giftRecordIds: []
            },
            refundable: true,
            metaInfo: [
                {
                    key: "SectionId",
                    value: "Featured"
                },
                {
                    key: "TileSize",
                    value: "Normal"
                }
            ],
            ...(displayAssetValidator(item.id) && { displayAssetPath: displayAssetValidator(item.id) }),
            itemGrants: [{ templateId: itemIdValidator(item.id, item.type?.id), quantity: 1 }],
            sortPriority: 0,
            catalogGroupPriority: 0
        });

        const makeDailyEntry = item => ({
            devName: `[VIRTUAL]1 x ${item?.name} for ${item?.price} MtxCurrency`,
            offerId: itemIdValidator(item.id, item.type?.id),
            fulfillmentIds: [],
            dailyLimit: -1,
            weeklyLimit: -1,
            monthlyLimit: -1,
            categories: [],
            prices: [{
                currencyType: "MtxCurrency",
                currencySubType: "",
                regularPrice: item?.price || 2000,
                finalPrice: item?.price || 2000,
                saleExpiration: futureDate,
                basePrice: item?.price || 2000
            }],
            meta: {
                SectionId: "Daily",
                TileSize: "Small"
            },
            matchFilter: "",
            filterWeight: 0,
            appStoreId: [],
            requirements: [],
            offerType: "StaticPrice",
            giftInfo: {
                bIsEnabled: true,
                forcedGiftBoxTemplateId: "",
                purchaseRequirements: [],
                giftRecordIds: []
            },
            refundable: true,
            metaInfo: [
                {
                    key: "SectionId",
                    value: "Daily"
                },
                {
                    key: "TileSize",
                    value: "Small"
                }
            ],
            displayAssetPath: "",
            itemGrants: [{ templateId: itemIdValidator(item.id, item.type?.id), quantity: 1 }],
            sortPriority: -1,
            catalogGroupPriority: 0
        });

        template.storefronts.find(s => s.name === "BRWeeklyStorefront").catalogEntries = weekly.map(makeWeeklyEntry);
        template.storefronts.find(s => s.name === "BRDailyStorefront").catalogEntries = daily.map(makeDailyEntry);

        fs.writeFileSync(paths.storefront, JSON.stringify(template, null, 4), 'utf-8');
        await generateSafeShop();
    } catch (e) {
        console.error(e.message);
    }
}

async function generateSafeShop() {
    try {
        const version = 1.11;
        const replaceVersion = v => parseFloat(v?.toString().replace('1.11', '2.00'));

        const storefront = JSON.parse(fs.readFileSync(paths.storefront, 'utf-8'));
        const cosmetics = JSON.parse(fs.readFileSync(paths.cosmetics, 'utf-8')).items;

        const cosmeticMap = {};
        for (const item of cosmetics) {
            const templateId = itemIdValidator(item.id, item.type?.id);
            cosmeticMap[templateId] = item;
        }

        const filterEntry = e => {
            const cosmetic = cosmeticMap[e.offerId];
            if (!cosmetic) return false;

            const itemVersion = replaceVersion(cosmetic.added?.version);
            return itemVersion <= replaceVersion(version) &&
                   !e.offerId.toLowerCase().includes('athenabackpack');
        };

        const weekly = storefront.storefronts.find(s => s.name === "BRWeeklyStorefront");
        const daily = storefront.storefronts.find(s => s.name === "BRDailyStorefront");

        weekly.catalogEntries = weekly.catalogEntries.filter(filterEntry);
        daily.catalogEntries = daily.catalogEntries.filter(filterEntry);

        fs.writeFileSync(paths.storefront_safe, JSON.stringify(storefront, null, 4), 'utf-8');
    } catch (e) {
        console.error(e.message);
    }
}

app.get('/fortnite/api/storefront/v2/catalog', async (req, res) => {
    try {
        const isEarlySeason = req.season <= 2;
        const filePath = isEarlySeason ? paths.storefront_safe : paths.storefront;

        let fileExists = false;
        try {
            const stats = fs.statSync(filePath);
            fileExists = stats.size > 0;
        } catch {
            fileExists = false;
        }

        if (!fileExists) {
            await generateShop();
        }

        let storefront = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(storefront);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load storefront.' });
    }
});

app.get('/fortnite/api/storefront/v2/keychain', async (req, res) => {
    const keychain = JSON.parse(fs.readFileSync('./backend/jsons/keychain.json', 'utf-8'));
    res.json(keychain);
});

app.get('/catalog/api/shared/bulk/offers', (req, res) => {
    res.json({});
});

module.exports = { app, generateShop };