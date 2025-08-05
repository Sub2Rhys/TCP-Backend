const config = require('../../../config.json');

const axios = require('axios');

const OPENFIRE_URL = `http://${config.openfire.domain}:${config.openfire.port || 9090}/plugins/restapi/v1`;
const API_SECRET = `${config.openfire.admin_username}:${config.openfire.admin_password}`;
const encodedSecret = Buffer.from(API_SECRET).toString('base64');

const api = axios.create({
    baseURL: OPENFIRE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedSecret}`
    },
});

async function getUsers() {
    try {
        const res = await api.get('/users');
        return res.data.users || [];
    } catch (err) {
        console.error(`Failed to get users: ${err.response?.statusText || err.message}`);
        return [];
    }
}

async function deleteUser(username) {
    try {
        await api.delete(`/users/${encodeURIComponent(username)}`);
    } catch (err) {
        console.error(`Failed to delete user ${username}: ${err.response?.statusText || err.message}`);
    }
}

async function createUser({ username, name = '', email = '', password, properties = [] }) {
    try {
        const users = await getUsers();
        const userExists = users.some(user => user.username === username);
        if (userExists) return;

        await api.post('/users', {
            username,
            password,
            name,
            email,
            properties
        });
    } catch {}
}

async function modifyUser(target, { username, name, email, password, properties }) {
    try {
        const users = await getUsers();
        const userExists = users.some(user => user.username === target);
        if (!userExists) {
            await createUser({ username: target, password });
            return;
        }

        const payload = {};
        if (username) payload.username = username;
        if (typeof name === 'string' && name.trim()) payload.name = name;
        if (typeof email === 'string' && email.trim()) payload.email = email;
        if (Array.isArray(properties) && properties.length) payload.properties = properties;
        if (password) payload.password = password;

        if (Object.keys(payload).length === 0) return;

        await api.put(`/users/${encodeURIComponent(target)}`, payload);
    } catch (err) {
        console.error(`Failed to modify user ${target}: ${err.response?.statusText || err.message}`);
    }
}

async function addUserToGroup(username, groupName) {
    try {
        await api.post(`/users/${encodeURIComponent(username)}/groups/${encodeURIComponent(groupName)}`);
    } catch (err) {
        console.error(`Failed to add user '${username}' to group '${groupName}': ${err.response?.statusText || err.message}`);
    }
}

async function removeUserFromGroup(username, groupName) {
    try {
        await api.delete(`/users/${encodeURIComponent(username)}/groups/${encodeURIComponent(groupName)}`);
    } catch (err) {
        console.error(`Failed to remove user '${username}' from group '${groupName}': ${err.response?.statusText || err.message}`);
    }
}

async function createChatRoom(payload) {
    try {
        await api.post(`/chatrooms?servicename=muc`, payload);
    } catch {}
}

module.exports = {
    getUsers,
    createUser,
    deleteUser,
    modifyUser,
    addUserToGroup,
    removeUserFromGroup,
    createChatRoom
};