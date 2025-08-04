const uuid = require('uuid');

async function sleep(ms) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    })
}

function generateId() {
    return uuid.v4();
}

function playlistNames(playlist) {
    switch (playlist) {
        case "2":
            return "Playlist_DefaultSolo";
        case "10":
            return "Playlist_DefaultDuo";
        case "9":
            return "Playlist_DefaultSquad";
        case "50":
        case "11":
            return "Playlist_50v50";
        case "13":
            return "Playlist_HighExplosives_Squads";
        case "22":
            return "Playlist_5x20";
        case "36":
            return "Playlist_Blitz_Solo";
        case "37":
            return "Playlist_Blitz_Duos";
        case "19":
            return "Playlist_Blitz_Squad";
        case "33":
            return "Playlist_Carmine";
        case "32":
            return "Playlist_Fortnite";
        case "23":
            return "Playlist_HighExplosives_Solo";
        case "24":
            return "Playlist_HighExplosives_Squads";
        case "44":
            return "Playlist_Impact_Solo";
        case "45":
            return "Playlist_Impact_Duos";
        case "46":
            return "Playlist_Impact_Squads";
        case "35":
            return "Playlist_Playground";
        case "30":
            return "Playlist_SkySupply";
        case "42":
            return "Playlist_SkySupply_Duos";
        case "43":
            return "Playlist_SkySupply_Squads";
        case "41":
            return "Playlist_Snipers";
        case "39":
            return "Playlist_Snipers_Solo";
        case "40":
            return "Playlist_Snipers_Duos";
        case "26":
            return "Playlist_SolidGold_Solo";
        case "27":
            return "Playlist_SolidGold_Squads";
        case "28":
            return "Playlist_ShowdownAlt_Solo";
        case "solo":
            return "2";
        case "duo":
            return "10";
        case "squad":
            return "9";
        default:
            return playlist;
    }
}

module.exports = {
    generateId,
    playlistNames,
    sleep,
};