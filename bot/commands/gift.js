const { SlashCommandBuilder } = require('discord.js');
const { addItem } = require('../../backend/functions/profile');
const { itemIdValidator } = require('../../backend/functions/validation');
const { validateUser, createResponse, extractOptions, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gift')
        .setDescription('Gift a user an item.')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('The username for the account.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('item')
                .setDescription('The name/id of the item you want to gift.')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName('alert')
                .setDescription('Display the gift screen when the user loads in?')
        ),

    async execute(interaction) {
        const options = extractOptions(interaction, [
            { key: 'username', type: 'string' },
            { key: 'item', type: 'string' },
            { key: 'alert', type: 'boolean' }
        ]);
        const { username, item, alert = false } = options;
        const message = 'Thanks for playing Fortnite!';

        if (!username) {
            targetUser = await validateAccount(interaction, true);
            if (!targetUser) return;
        } else {
            targetUser = await validateUser(interaction, username);
            if (!targetUser) return;
            
            if (targetUser.userId !== currentUserId && !isUserAdmin) {
                return createResponse(interaction, {
                    color: 'Red',
                    title: 'Access Denied',
                    description: 'You can only modify your own account.'
                });
            }
        }

        const user = await validateUser(interaction, username);
        if (!user) return;

        addItem({ 
            accountId: user.userId, 
            message, 
            items: itemIdValidator(item), 
            giftboxId: 'GiftBox:gb_makegood', 
            quantity: 1, 
            alert 
        });

        return createResponse(interaction, RESPONSES.SUCCESS(`The user \`${user.displayName}\` has been gifted \`${item}\`.`));
    },
};