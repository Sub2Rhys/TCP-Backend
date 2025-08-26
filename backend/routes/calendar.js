const express = require('express');
const app = express.Router();
const config = require('../../config.json');

const getFutureDate = (days = 0) => {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    d.setTime(d.getTime() - 60000);
    d.setDate(d.getDate() + days);
    return d.toISOString();
};

app.get('/fortnite/api/calendar/v1/timeline', async (req, res) => {
    const futureDate = getFutureDate();
    const futureDateMonth = getFutureDate(90);
    const now = new Date().toISOString();

    let lobby;
    let activeEvents = [];

    if (req.cl >= 3807424 && req.cl <= 3825894) {
        lobby = 'LobbyWinterDecor';
    } else if (req.cl >= 4497486 && req.cl <= 4543176) {
        lobby = 'LobbySeason6Halloween';
    } else if (req.season == 9) {
        activeEvents.push({
            "eventType": "EventFlag.Season9.Phase1",
            "activeUntil": "9999-01-01T00:00:00.000Z",
            "activeSince": "2020-01-01T00:00:00.000Z"
        });
        lobby = `LobbySeason9`;
    } else {
        lobby = `LobbySeason${req.season || 0}`;
    }

    activeEvents.push(
        {
            "eventType": `EventFlag.${lobby}`,
            "activeUntil": futureDateMonth,
            "activeSince": now
        },
        {
            "eventType": `EventFlag.Season${req.season || 0}`,
            "activeUntil": futureDateMonth,
            "activeSince": now
        }
    );

    res.json({
        "channels": {
            "client-matchmaking": {
                "states": [],
                "cacheExpire": "9999-12-31T23:59:59.999Z"
            },
            "client-events": {
                "states": [
                    {
                        "validFrom": "0001-01-01T00:00:00.000Z",
                        "activeEvents": activeEvents,
                        "state": {
                            "activeStorefronts": [],
                            "eventNamedWeights": {},
                            "seasonNumber": config.backend.season,
                            "seasonTemplateId": `AthenaSeason:athenaseason${config.backend.season}`,
                            "seasonBegin": now,
                            "seasonEnd": futureDateMonth,
                            "seasonDisplayedEnd": futureDateMonth,
                            "weeklyStoreEnd": futureDate,
                            "dailyStoreEnd": futureDate,
                            "sectionStoreEnds": {
                                "Featured": futureDate
                            }
                        }
                    }
                ],
                "cacheExpire": "9999-12-31T23:59:59.999Z"
            }
        },
        "eventsTimeOffsetHrs": 0,
        "cacheIntervalMins": 1,
        "currentTime": now
    });
});

module.exports = app;