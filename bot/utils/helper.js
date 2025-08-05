const config = require('../../config.json');
const { User } = require('../../models/mongoose');

const RESPONSES = {
    ACCESS_DENIED: {
        color: 'Red',
        title: 'Access Denied',
        description: 'You must be an administrator to use this command.'
    },
    ACCESS_DENIED_HOSTER: {
        color: 'Red',
        title: 'Access Denied',
        description: 'You must be a hoster to use this command.'
    },
    USER_NOT_FOUND: (username) => ({
        color: 'Yellow',
        title: 'User Not Found',
        description: `Unable to find the user \`${username}\` in the backend.`
    }),
    ACCOUNT_NOT_FOUND: {
        color: 'Yellow',
        title: 'Account Not Found',
        description: 'Use `/create` to make an account.'
    },
    SUCCESS: (message) => ({
        color: 'Green',
        title: 'Success',
        description: message
    }),
    ERROR: (message) => ({
        color: 'Red',
        title: 'Error',
        description: message
    }),
    WARNING: (message) => ({
        color: 'Yellow',
        title: 'Warning',
        description: message
    })
};

function isAdmin(userId) {
    return config.discord.admins.includes(userId);
}

function isHoster(interaction) {
    const member = interaction.member;
    if (!member) return false;
    return member.roles.cache.has(config.discord.hoster_role);
}

async function findUserByUsername(username) {
    return await User.findOne({
        displayName: { $regex: new RegExp(`^${username}$`, 'i') }
    });
}

async function findUserById(userId) {
    return await User.findOne({ userId });
}

async function createResponse(interaction, responseConfig, ephemeral = false, followUp = false) {
    const embed = await require('../createEmbed.js')(interaction);
    embed.setColor(responseConfig.color)
         .setTitle(responseConfig.title)
         .setDescription(responseConfig.description);
   
    const replyOptions = { embeds: [embed] };
    if (ephemeral) {
        replyOptions.flags = require('discord.js').MessageFlags.Ephemeral;
    }
   
    if (followUp) {
        return interaction.followUp(replyOptions);
    } else if (interaction.replied || interaction.deferred) {
        return interaction.editReply(replyOptions);
    } else {
        return interaction.reply(replyOptions);
    }
}

async function requireAdmin(interaction) {
    if (!isAdmin(interaction.user.id)) {
        await createResponse(interaction, RESPONSES.ACCESS_DENIED);
        return false;
    }
    return true;
}

async function requireHoster(interaction) {
    if (!isAdmin(interaction.user.id)) {
        await createResponse(interaction, RESPONSES.ACCESS_DENIED_HOSTER);
        return false;
    }
    return true;
}

async function validateUser(interaction, username, ephemeral = false) {
    const user = await findUserByUsername(username);
    if (!user) {
        await createResponse(interaction, RESPONSES.USER_NOT_FOUND(username), ephemeral);
        return null;
    }
    return user;
}

async function validateAccount(interaction, ephemeral = true) {
    const user = await findUserById(interaction.user.id);
    if (!user) {
        await createResponse(interaction, RESPONSES.ACCOUNT_NOT_FOUND, ephemeral);
        return null;
    }
    return user;
}

function extractOptions(interaction, optionNames) {
    const options = {};
    optionNames.forEach(name => {
        if (typeof name === 'string') {
            options[name] = interaction.options.getString(name) ||
                           interaction.options.getNumber(name) ||
                           interaction.options.getBoolean(name);
        } else if (typeof name === 'object') {
            const { key, type, required = false } = name;
            let value;
            switch (type) {
                case 'string':
                    value = interaction.options.getString(key);
                    break;
                case 'number':
                    value = interaction.options.getNumber(key);
                    break;
                case 'boolean':
                    value = interaction.options.getBoolean(key);
                    break;
                default:
                    value = interaction.options.getString(key);
            }
            options[key] = value;
        }
    });
    return options;
}

module.exports = {
    RESPONSES,
    isAdmin,
    isHoster,
    findUserByUsername,
    findUserById,
    createResponse,
    requireAdmin,
    requireHoster,
    validateUser,
    validateAccount,
    extractOptions
};