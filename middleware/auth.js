const { validateAccessToken, revokeTokens, trackUserIP, getClientIP } = require('../backend/functions/tokens');
const { User } = require('../models/mongoose');

async function requireAuth(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            errorMessage: "Authentication failed" + (req.path ? ` for ${req.path}` : ""),
            errorCode: "errors.com.epicgames.common.authentication.authentication_failed"
        });
    }
    
    try {
        const validation = await validateAccessToken(token);
        
        if (!validation) {
            return res.status(401).json({
                errorMessage: `There was an issue verifying token ${token}. Token contains invalid data.`,
                errorCode: "errors.com.epicgames.common.oauth.invalid_token"
            });
        }

        const user = await User.findOne({ userId: validation.userId }).lean();
        if (!user || user?.isBanned) {
            await revokeTokens(validation.userId);
            return res.status(404).json({
                errorMessage: "Login is banned or does not posses the action 'PLAY' needed to perform the requested operation for platform",
                errorCode: "errors.com.epicgames.common.missing_action"
            });
        }

        const clientIP = getClientIP(req);
        trackUserIP(validation.userId, clientIP);
        
        req.user = { userId: validation.userId };
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({
            errorMessage: "Sorry an error occurred and we were unable to resolve it",
            errorCode: "errors.com.epicgames.common.server_error"
        });
    }
}

module.exports = { requireAuth };