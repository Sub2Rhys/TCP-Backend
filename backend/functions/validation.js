const fs = require('node:fs').promises;
const path = require('path');

function displayAssetValidator(itemId) {
    let id;
    let idNumber = itemId?.toLowerCase()?.split('id_')?.[1]?.split('_')?.[0];

    if (itemId.toLowerCase().includes('cid_') && Number(idNumber) < 52) {
        const idGender = itemId.toLowerCase().includes('_m_') ? 'SMale' : 'SFemale';
        if (itemId.toLowerCase().includes('halloween')) {
            idNumber = 'Halloween';
        } else {
            idNumber = 'HID' + idNumber;
        }
        
        id = idGender + idNumber;
    } else {
        id = itemId;
    }

    return `/Game/Catalog/DisplayAssets/DA_Featured_${id}.DA_Featured_${id}`;
}

function itemIdValidator(itemId, itemType) {
    const itemTypeMap = {
        'cid_': 'AthenaCharacter',
        'character_': 'AthenaCharacter',
        'bid_': 'AthenaBackpack',
        'backpack_': 'AthenaBackpack',
        'pickaxe': 'AthenaPickaxe',
        'eid_': 'AthenaDance',
        'spray_': 'AthenaDance',
        'spid_': 'AthenaDance',
        'emoji_': 'AthenaDance',
        'glider': 'AthenaGlider',
        'umbrella_': 'AthenaGlider',
        'contrail_': 'AthenaSkyDiveContrail',
        'trails_': 'AthenaSkyDiveContrail',
        'loadingscreen_': 'AthenaLoadingScreen',
        'lsid_': 'AthenaLoadingScreen',
        'musicpack_': 'AthenaMusicPack',
        'wrap_': 'AthenaItemWrap',
    };

    let newItemId = itemId.toLowerCase();

    if (newItemId.includes(':')) {
        newItemId = newItemId.split(':')[1];
    }

    if (itemType && itemTypeMap[itemType.toLowerCase()]) {
        const athenaType = itemTypeMap[itemType.toLowerCase()];
        return `${athenaType}:${newItemId}`;
    }

    for (const [prefix, type] of Object.entries(itemTypeMap)) {
        if (newItemId.includes(prefix)) {
            return `${type}:${newItemId}`;
        }
    }

    return itemId;
}

async function getItemDetails(searchKey) {
    if (!searchKey) return null;
    
    try {
        const filePath = path.resolve(__dirname, '../jsons/cosmetics/cosmetics.json');
        const cosmetics = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(cosmetics);

        if (!data || !Array.isArray(data.items)) {
            return null;
        }

        const keyLower = searchKey?.toLowerCase();

        return data.items.find(item =>
            (item.id && item.id.toLowerCase() === keyLower) ||
            (item.name && item.name.toLowerCase() === keyLower)
        ) || null;

    } catch (error) {
        console.error('Error reading or parsing file:', error);
        return null;
    }
}

module.exports = {
    displayAssetValidator,
    itemIdValidator,
    getItemDetails
};