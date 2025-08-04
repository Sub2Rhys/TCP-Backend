const { validateAccessToken } = require('../backend/functions/tokens');

async function getVersion(req, res, next) {
    try {
        const userAgent = req.headers['user-agent'];
        const versionDetails = userAgent?.split('-')?.[1];
        const cl = userAgent?.split('CL-')?.[1]?.split(' ')?.[0]?.replace(',', '') || userAgent?.split('-')?.[1]?.split('+++')?.[0] || '';

        req.version = versionDetails?.split('-')?.[0];
        req.season = versionDetails?.split('.')?.[0];
        req.cl = cl;

        if (cl == 2870186) req.season = 'OT6.5';
        if (cl == 3532353) req.season = 'OT11';
        if (isNaN(req.season) && cl >= 3700114 && cl < 3724489) req.season = 0;
        if (isNaN(req.season) && cl >= 3724489 && cl < 3807424) req.season = 1;
        if (isNaN(req.season) && cl >= 3807424 && cl < 3901517) req.season = 2;

        const versionMap = {
            2870186: 'OT6.5',
            3532353: 'OT11',
            3700114: '1.7.2',
            3724489: '1.8',
            3729133: '1.8.1',
            3741772: '1.8.2',
            3757339: '1.9',
            3775276: '1.9.1',
            3790078: '1.10',
            3807424: '1.11',
            3825894: '2.1.0',
            3841827: '2.2.0',
            3847564: '2.3.0',
            3858292: '2.4.0',
            3870737: '2.4.2',
            3889387: '2.5.0',
        };

        if (versionMap[cl]) req.version = versionMap[cl];

        const token = req.headers['authorization']?.split(' ')?.[1];
        const validation = await validateAccessToken(token);

        if (validation?.userId) {
            global.versions[validation.userId] = {
                version: req.version,
                season: req.season,
                cl: req.cl
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { getVersion };