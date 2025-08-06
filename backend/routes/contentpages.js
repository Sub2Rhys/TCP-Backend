const express = require('express');
const app = express.Router();
const { User, Servers } = require('../../models/mongoose');
const { getUserIdByIP, getClientIP } = require('../functions/tokens');

/*
    this whole custom page system is kinda shit and just a weird gimmick tbh i might delete so contentpages doesn't take 20 years to load up.
*/

async function ipAuth(req, res, next) {
    const clientIP = getClientIP(req);
    const maxRetries = 20;
    const retryInterval = 1000;
    
    let retries = 0;
    
    const checkAuth = () => {
        const userId = getUserIdByIP(clientIP);
        
        if (userId) {
            req.userId = userId;
            return next();
        }
        
        retries++;
        if (retries >= maxRetries) {
            req.userId = null;
            return next();
        }
        
        setTimeout(checkAuth, retryInterval);
    };
    
    checkAuth();
}

function createBaseResponse(newsMessages = [], messages = {}) {
    return {
        "_title": "Fortnite Game",
        "_activeDate": "2017-08-30T03:20:48.050Z",
        "lastModified": "2024-12-09T23:20:04.923Z",
        "_locale": "en-US",
        "_templateName": "blank",
        "subgameinfo": {
            "_title": "SubgameInfo",
            "_noIndex": false,
            "battleroyale": {
                "image": "",
                "color": "5b2569",
                "_type": "Subgame Info",
                "description": "100 Player PvP",
                "subgame": "battleroyale",
                "standardMessageLine2": "",
                "title": "Battle Royale",
                "standardMessageLine1": ""
            },
            "savetheworld": {
                "image": "https://cdn2.unrealengine.com/Fortnite/fortnite-game/subgameinfo/StW/09_SubgameSelect_Default_StW-512x1024-e47f51e25cbe9943678b9221056a808e81da40e3.jpg",
                "color": "7615E9FF",
                "specialMessage": "",
                "_type": "Subgame Info",
                "description": "Cooperative PvE Adventure",
                "subgame": "savetheworld",
                "standardMessageLine2": "",
                "title": "Save The World",
                "standardMessageLine1": ""
            },
            "creative": {
                "image": "https://cdn2.unrealengine.com/subgameselect-cr-512x1024-371f42541731.png",
                "color": "0658b9",
                "_type": "Subgame Info",
                "description": "Your Islands. Your Friends. Your Rules.",
                "subgame": "creative",
                "title": "Creative",
                "standardMessageLine1": ""
            },
            "_activeDate": "2019-11-05T05:00:00.000Z",
            "lastModified": "2022-01-06T13:12:53.445Z",
            "_locale": "en-US",
            "_templateName": "SubgameInfo"
        },
        "survivalmessage": {
            "_title": "survivalmessage",
            "overrideablemessage": {
                "_type": "CommonUI Simple Message",
                "message": {
                    "_type": "CommonUI Simple Message Base",
                    "title": "The Survive the Storm event is now live!",
                    "body": "Take the pledge:\nSelect a target survival time of 3 or 7 nights.\n\nSend Feedback:\nSurvive the Storm is still in development. We'd love to hear what you think."
                }
            },
            "_activeDate": "2017-08-25T20:35:56.304Z",
            "lastModified": "2017-12-12T17:14:26.597Z",
            "_locale": "en-US",
            "_templateName": "FortniteGameMOTD"
        },
        "lobby": {
            "backgroundimage": "https://cdn2.unrealengine.com/Fortnite/fortnite-game/lobby/T_Lobby_SeasonX-2048x1024-24e02780ed533da8001016f4e6fb14dd15e2f860.png",
            "stage": `seasonx`,
            "_title": "lobby",
            "_activeDate": "2019-05-31T21:24:39.892Z",
            "lastModified": "2019-07-31T21:24:17.119Z",
            "_locale": "en-US",
            "_templateName": "FortniteGameLobby"
        },
        "subgameselectdata": {
            "saveTheWorldUnowned": {
                "_type": "CommonUI Simple Message",
                "message": {
                    "image": "https://cdn2.unrealengine.com/Fortnite/fortnite-game/subgameselect/STW/08StW_BombsquadKyle_SubgameSelect-1920x1080-4e747f76f1ec82f49481d83331586ce401bb4c73.jpg",
                    "hidden": false,
                    "messagetype": "normal",
                    "_type": "CommonUI Simple Message Base",
                    "title": "Co-op PvE",
                    "body": "Cooperative PvE storm-fighting adventure!",
                    "spotlight": false
                }
            },
            "_title": "subgameselectdata",
            "battleRoyale": {
                "_type": "CommonUI Simple Message",
                "message": {
                    "image": "",
                    "hidden": false,
                    "messagetype": "normal",
                    "_type": "CommonUI Simple Message Base",
                    "title": "100 Player PvP",
                    "body": "100 Player PvP Battle Royale.\n\nPvE progress does not affect Battle Royale.",
                    "spotlight": false
                }
            },
            "creative": {
                "_type": "CommonUI Simple Message",
                "message": {
                    "image": "https://cdn2.unrealengine.com/Fortnite/fortnite-game/subgameselect/08CM_BallerCoaster_SubgameSelect-(1)-1920x1080-a63970907455cb28d286c806cad214d279768cbb.jpg",
                    "hidden": false,
                    "messagetype": "normal",
                    "_type": "CommonUI Simple Message Base",
                    "title": "New Featured Islands!",
                    "body": "Your Island. Your Friends. Your Rules.\n\nDiscover new ways to play Fortnite, play community made games with friends and build your dream island.",
                    "spotlight": false
                }
            },
            "saveTheWorld": {
                "_type": "CommonUI Simple Message",
                "message": {
                    "image": "https://cdn2.unrealengine.com/Fortnite/fortnite-game/subgameselect/STW/08StW_BombsquadKyle_SubgameSelect-1920x1080-4e747f76f1ec82f49481d83331586ce401bb4c73.jpg",
                    "hidden": false,
                    "messagetype": "normal",
                    "_type": "CommonUI Simple Message Base",
                    "title": "Co-op PvE",
                    "body": "Cooperative PvE storm-fighting adventure!",
                    "spotlight": false
                }
            },
            "_activeDate": "2017-10-11T18:37:23.145Z",
            "lastModified": "2019-05-06T12:59:15.974Z",
            "_locale": "en-US",
            "_templateName": "FortniteGameSubgameSelectData"
        },
        "battleroyalenews": {
            "news": {
                "_type": "Battle Royale News",
                "messages": newsMessages,
            }
        },
        ...messages
    };
}

app.get('/content/api/pages/fortnite-game', ipAuth, async (req, res) => {
    let newsMessages = [];
    let messages = {};

    try {
        if (req.userId) {
            const user = await User.findOne({ userId: req.userId });
            if (user) {
                const server = await Servers.findOne({ userId: user.hosterId || global.owner_id });
                if (server && Array.isArray(server.news)) {
                    newsMessages = server.news.map(item => {
                        if (typeof item.image === "string" && req.cl >= 4305896) {
                            item.image = item.image.replace(/w=\d+/g, 'w=1024');
                        }
                        return item;
                    });
                }
            }
        }
    } catch (error) {
        console.log(error)
    }

    res.json(createBaseResponse(newsMessages, messages));
});

module.exports = app;