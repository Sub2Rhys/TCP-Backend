const express = require('express');
const app = express.Router();

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');

const { User } = require('../../models/mongoose');
const { generateAccess, generateTokenPair, validateAccessToken, validateRefreshToken, revokeTokens, trackUserIP, getClientIP } = require('../functions/tokens');
const { handleProfile } = require('../functions/profile');
const { modifyUser, addUserToGroup } = require('../xmpp/openfire/api');

global.versions = {};

function createTokenResponse(accessToken, refreshToken, user, now) {
    return {
        access_token: accessToken.token,
        expires_in: Math.floor((accessToken.expiresAt.getTime() - now) / 1000),
        expires_at: accessToken.expiresAt.toISOString(),
        token_type: "bearer",
        refresh_token: refreshToken.token,
        refresh_expires: Math.floor((refreshToken.expiresAt.getTime() - now) / 1000),
        refresh_expires_at: refreshToken.expiresAt.toISOString(),
        account_id: user.userId,
        client_id: "3446cd72694c4a4485d81b77adbb2141",
        internal_client: false,
        client_service: "prod-fn",
        displayName: user.displayName,
        app: "prod-fn",
        in_app_id: user.userId,
        product_id: "prod-fn",
        acr: "urn:epic:loa:aal1",
        auth_time: accessToken.createdAt.toISOString()
    };
}

app.post('/account/api/oauth/token', async (req, res) => {
    const { username, password, grant_type, refresh_token } = req.body;
    const now = Date.now();
    const clientIP = getClientIP(req);

    try {
        if (grant_type === 'password') {
            if (!username || !password) {
                return res.status(400).json({ 
                    errorMessage: "Username and password are required", 
                    errorCode: "errors.com.epicgames.common.oauth.invalid_request" 
                });
            }

            const user = await User.findOne({ email: username?.toLowerCase() }).lean();
            
            if (!user?.password || !await bcrypt.compare(password, user.password)) {
                return res.status(404).json({ 
                    errorMessage: "Your e-mail and/or password are incorrect. Please check them and try again.", 
                    errorCode: "errors.com.epicgames.account.invalid_account_credentials" 
                });
            }

            await revokeTokens(user.userId);
            
            const sessionId = crypto.randomBytes(16).toString('hex');
            const { accessToken, refreshToken } = await generateTokenPair(user.userId, sessionId);

            trackUserIP(user.userId, clientIP);

            try {
                if (!user.displayName.toLowerCase().includes("host-")) {
                    await modifyUser(user.userId, { password: accessToken.token });
                    await addUserToGroup(user.userId, 'users');
                }
            } catch (error) {
                console.warn(error.message);
            }

            return res.json(createTokenResponse(accessToken, refreshToken, user, now));
        }

        if (grant_type === 'refresh_token') {
            if (!refresh_token) {
                return res.status(400).json({ 
                    errorMessage: "Refresh token is required", 
                    errorCode: "errors.com.epicgames.common.oauth.invalid_request" 
                });
            }

            const validation = await validateRefreshToken(refresh_token);
            if (!validation) {
                return res.status(401).json({ 
                    errorMessage: "Invalid or expired refresh token", 
                    errorCode: "errors.com.epicgames.common.oauth.invalid_token" 
                });
            }

            const user = await User.findOne({ userId: validation.userId }).lean();
            if (!user) {
                await revokeTokens(validation.userId);
                return res.status(404).json({ 
                    errorMessage: "User not found", 
                    errorCode: "errors.com.epicgames.account.user_not_found" 
                });
            }

            const existingSessionId = global.sessions[validation.userId];
            
            const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(validation.userId, existingSessionId);

            trackUserIP(validation.userId, clientIP);

            return res.json(createTokenResponse(accessToken, newRefreshToken, user, now));
        }

        if (grant_type === 'client_credentials') {
            const tokenData = await generateAccess(null, 'client_credentials');
            
            return res.json({
                access_token: tokenData.token,
                expires_in: Math.floor((tokenData.expiresAt.getTime() - now) / 1000),
                expires_at: tokenData.expiresAt.toISOString(),
                token_type: "bearer",
                client_id: "ec684b8c687f479fadea3cb2ad83f5c6",
                internal_client: true,
                client_service: "prod-fn",
                product_id: "prod-fn",
                application_id: "fghi4567FNFBKFz3E4TROb0bmPS8h1GW"
            });
        }

        return res.status(400).json({ 
            errorMessage: "Unsupported grant type", 
            errorCode: "errors.com.epicgames.common.oauth.unsupported_grant_type" 
        });
    } catch (error) {
        console.error('OAuth token error:', error);
        return res.status(500).json({ 
            errorMessage: "Internal server error", 
            errorCode: "errors.com.epicgames.common.server_error" 
        });
    }
});

app.get('/account/api/oauth/verify', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')?.[1];
    
    if (!token) {
        return res.status(401).json({ 
            errorMessage: "Authorization header missing", 
            errorCode: "errors.com.epicgames.common.authentication.authentication_failed" 
        });
    }

    const validation = await validateAccessToken(token);
    if (!validation) {
        return res.status(404).json({ 
            errorMessage: "Invalid or expired token", 
            errorCode: "errors.com.epicgames.common.oauth.invalid_token" 
        });
    }

    const { userId, tokenData } = validation;
    const sessionId = global.sessions[userId];
    
    if (!sessionId) {
        return res.status(404).json({ 
            errorMessage: "Session not found", 
            errorCode: "errors.com.epicgames.common.session.session_not_found" 
        });
    }

    try {
        const user = await User.findOne({ userId }).lean();
        if (!user) {
            await revokeTokens(userId);
            return res.status(404).json({ 
                errorMessage: "User not found", 
                errorCode: "errors.com.epicgames.account.user_not_found" 
            });
        }

        return res.json({
            token: token,
            session_id: sessionId,
            token_type: "bearer",
            client_id: "34a02cf8f4414e29b15921876da36f9a",
            internal_client: true,
            client_service: "launcher",
            account_id: userId,
            expires_in: Math.floor((tokenData.expiresAt.getTime() - Date.now()) / 1000),
            expires_at: tokenData.expiresAt.toISOString(),
            auth_method: "exchange_code",
            display_name: user.displayName,
            app: "launcher",
            in_app_id: userId,
            perms: [{
                resource: "launcher:download:live",
                action: 2
            }, {
                resource: "catalog:shared:*",
                action: 2
            }]
        });
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ 
            errorMessage: "Internal server error", 
            errorCode: "errors.com.epicgames.common.server_error" 
        });
    }
});

app.get('/account/api/public/account/:accountId', requireAuth, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.accountId }).lean();
        
        if (!user) {
            return res.status(404).json({ 
                errorMessage: "Account not found", 
                errorCode: "errors.com.epicgames.account.account_not_found" 
            });
        }

        return res.json({
            id: user.userId,
            displayName: user.displayName,
            name: "",
            email: "",
            failedLoginAttempts: 0,
            lastLogin: "9999-12-31T23:59:59.999Z",
            numberOfDisplayNameChanges: 0,
            ageGroup: "UNKNOWN",
            headless: false,
            country: "",
            lastName: "",
            phoneNumber: "",
            preferredLanguage: "en",
            links: {},
            lastDisplayNameChange: "9999-12-31T23:59:59.999Z",
            canUpdateDisplayName: true,
            tfaEnabled: true,
            emailVerified: true,
            minorVerified: false,
            minorExpected: false,
            minorStatus: "NOT_MINOR",
            siweNotificationEnabled: true,
            cabinedMode: false,
            hasHashedEmail: false,
            lastReviewedSecuritySettings: "9999-12-31T23:59:59.999Z",
            lastDeclinedMFASetup: "9999-12-31T23:59:59.999Z"
        });
    } catch (error) {
        console.error('Account lookup error:', error);
        return res.status(500).json({ 
            errorMessage: "Internal server error", 
            errorCode: "errors.com.epicgames.common.server_error" 
        });
    }
});

app.get('/account/api/public/account/:accountId/externalAuths', requireAuth, (req, res) => {
    res.json({});
});

app.delete('/account/api/oauth/sessions/kill/:token', requireAuth, async (req, res) => {
    const token = req.params.token;
    
    try {
        const validation = await validateAccessToken(token);
        if (validation) {
            await revokeTokens(validation.userId);
        }

        if (validation.userId) {
            delete global.keys[validation.userId];
            delete global.versions[validation.userId];
            
            await handleProfile('common_core', validation.userId, ({ profile }) => {
                profile.profileChanges = profile.profileChanges.filter(item => {
                    return item?.changeType != 'itemAdded' && item?.changeType != 'itemRemoved' && item?.changeType != 'itemQuantityChanged';
                });
            });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error('Logout error:', error);
        res.status(204).send();
    }
});

module.exports = app;