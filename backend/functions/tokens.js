const crypto = require('node:crypto');
const { Tokens } = require('../../models/mongoose');

global.access_tokens = {};
global.refresh_tokens = {};
global.sessions = {};
global.user_ips = {};

const TOKEN_EXPIRY = {
    ACCESS_TOKEN: 2 * 60 * 60 * 1000,
    REFRESH_TOKEN: 48 * 60 * 60 * 1000,
    CLIENT_CREDENTIALS: 4 * 60 * 60 * 1000
};

async function loadTokensFromDatabase() {
    try {
        const tokens = await Tokens.find({});
        const now = new Date();
        
        tokens.forEach(tokenDoc => {
            const { userId, accessToken, refreshToken, sessionId } = tokenDoc;
            
            if (accessToken.expiresAt > now) {
                global.access_tokens[userId] = accessToken;
            }
            
            if (refreshToken.expiresAt > now) {
                global.refresh_tokens[userId] = refreshToken;
            }
            
            if (sessionId) {
                global.sessions[userId] = sessionId;
            }
        });
    } catch (error) {
        console.error('Error loading tokens from database:', error);
    }
}

async function saveTokenToDatabase(userId, accessToken, refreshToken, sessionId = null) {
    try {
        await Tokens.findOneAndUpdate(
            { userId },
            {
                userId,
                accessToken,
                refreshToken,
                sessionId
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Error saving token to database:', error);
    }
}

async function removeTokenFromDatabase(userId) {
    try {
        await Tokens.deleteOne({ userId });
    } catch (error) {
        console.error('Error removing token from database:', error);
    }
}

async function generateAccess(userId, tokenType = 'access') {
    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiryTime = tokenType === 'client_credentials' ? TOKEN_EXPIRY.CLIENT_CREDENTIALS : TOKEN_EXPIRY.ACCESS_TOKEN;

    const accessToken = {
        token,
        createdAt: now,
        expiresAt: new Date(now.getTime() + expiryTime),
        tokenType
    };

    if (tokenType === 'client_credentials') {
        global.access_tokens[userId || 'client'] = accessToken;
        return accessToken;
    }

    global.access_tokens[userId] = accessToken;
    return accessToken;
}

async function generateRefresh(userId) {
    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date();

    const refreshToken = {
        token,
        createdAt: now,
        expiresAt: new Date(now.getTime() + TOKEN_EXPIRY.REFRESH_TOKEN)
    };

    global.refresh_tokens[userId] = refreshToken;
    return refreshToken;
}

async function generateTokenPair(userId, sessionId = null) {
    const accessToken = await generateAccess(userId);
    const refreshToken = await generateRefresh(userId);
    
    if (sessionId) {
        global.sessions[userId] = sessionId;
    }
    
    await saveTokenToDatabase(userId, accessToken, refreshToken, sessionId);
    
    return { accessToken, refreshToken };
}

function isTokenExpired(tokenData) {
    return !tokenData?.expiresAt || new Date() > new Date(tokenData.expiresAt);
}

async function validateAccessToken(token) {
    const userId = Object.keys(global.access_tokens).find(key => 
        global.access_tokens[key].token === token
    );
    
    if (userId) {
        const tokenData = global.access_tokens[userId];
        if (isTokenExpired(tokenData)) {
            delete global.access_tokens[userId];
            await removeTokenFromDatabase(userId);
            return;
        }
        return { userId, tokenData };
    }
    
    try {
        const tokenDoc = await Tokens.findOne({ 'accessToken.token': token });
        if (!tokenDoc) return;
        
        const { userId: dbUserId, accessToken } = tokenDoc;
        
        if (isTokenExpired(accessToken)) {
            await removeTokenFromDatabase(dbUserId);
            return;
        }
        
        global.access_tokens[dbUserId] = accessToken;
        if (tokenDoc.refreshToken) {
            global.refresh_tokens[dbUserId] = tokenDoc.refreshToken;
        }
        if (tokenDoc.sessionId) {
            global.sessions[dbUserId] = tokenDoc.sessionId;
        }
        
        return { userId: dbUserId, tokenData: accessToken };
    } catch (error) {
        console.error('Error validating access token:', error);
        return;
    }
}

async function validateRefreshToken(token) {
    const userId = Object.keys(global.refresh_tokens).find(key => 
        global.refresh_tokens[key].token === token
    );
    
    if (userId) {
        const tokenData = global.refresh_tokens[userId];
        if (isTokenExpired(tokenData)) {
            delete global.refresh_tokens[userId];
            await removeTokenFromDatabase(userId);
            return;
        }
        return { userId, tokenData };
    }
    
    try {
        const tokenDoc = await Tokens.findOne({ 'refreshToken.token': token });
        if (!tokenDoc) return;
        
        const { userId: dbUserId, refreshToken } = tokenDoc;
        
        if (isTokenExpired(refreshToken)) {
            await removeTokenFromDatabase(dbUserId);
            return;
        }
        
        global.refresh_tokens[dbUserId] = refreshToken;
        if (tokenDoc.accessToken) {
            global.access_tokens[dbUserId] = tokenDoc.accessToken;
        }
        if (tokenDoc.sessionId) {
            global.sessions[dbUserId] = tokenDoc.sessionId;
        }
        
        return { userId: dbUserId, tokenData: refreshToken };
    } catch (error) {
        console.error('Error validating refresh token:', error);
        return;
    }
}

async function revokeTokens(userId) {
    delete global.access_tokens[userId];
    delete global.refresh_tokens[userId];
    delete global.sessions[userId];
        
    await removeTokenFromDatabase(userId);
}

async function cleanExpiredTokens() {
    Object.keys(global.access_tokens).forEach(userId => {
        if (isTokenExpired(global.access_tokens[userId])) {
            delete global.access_tokens[userId];
        }
    });
    
    Object.keys(global.refresh_tokens).forEach(userId => {
        if (isTokenExpired(global.refresh_tokens[userId])) {
            delete global.refresh_tokens[userId];
        }
    });
    
    try {
        const now = new Date();
        await Tokens.deleteMany({
            $or: [
                { 'accessToken.expiresAt': { $lt: now } },
                { 'refreshToken.expiresAt': { $lt: now } }
            ]
        });
    } catch (error) {
        console.error('Error cleaning expired tokens from database:', error);
    }
}

loadTokensFromDatabase();

setInterval(cleanExpiredTokens, 30 * 60 * 1000);

module.exports = {
    generateAccess,
    generateRefresh,
    generateTokenPair,
    validateAccessToken,
    validateRefreshToken,
    revokeTokens,
    cleanExpiredTokens
};