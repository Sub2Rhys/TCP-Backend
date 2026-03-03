const { SlashCommandBuilder } = require('discord.js');
const { addItem } = require('../../backend/functions/profile');
const { itemIdValidator } = require('../../backend/functions/validation');
const { requireAdmin, validateAccount, createResponse, RESPONSES } = require('../utils/helper');
const { Code } = require('../../models/mongoose');

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const block = () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    return `${block()}-${block()}-${block()}`;
}

function isItemValidated(rawItem, validatedItem) {
    return validatedItem !== rawItem && validatedItem.includes(':');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('code')
        .setDescription('Code related commands.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('generate')
                .setDescription('Generate a redeemable code.')
                .addStringOption(option =>
                    option
                        .setName('item')
                        .setDescription('The item to bind to the code.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('redeem')
                .setDescription('Redeem a code.')
                .addStringOption(option =>
                    option
                        .setName('code')
                        .setDescription('The code to redeem.')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'generate') {
            if (!(await requireAdmin(interaction))) return;

            const rawItem = interaction.options.getString('item');
            const validatedItem = itemIdValidator(rawItem);

            if (!isItemValidated(rawItem, validatedItem)) {
                return createResponse(
                    interaction,
                    RESPONSES.ERROR('Invalid item.')
                );
            }

            const code = generateCode();

            await Code.create({
                code,
                item: validatedItem,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
            });

            return createResponse(
                interaction,
                RESPONSES.SUCCESS(`Code generated:\n\`${code}\`\nItem: \`${validatedItem}\``)
            );
        }

        if (subcommand === 'redeem') {
            const codeInput = interaction.options.getString('code');

            const codeDoc = await Code.findOne({ code: codeInput });
            if (!codeDoc || codeDoc.redeemed) {
                return createResponse(
                    interaction,
                    RESPONSES.ERROR('Invalid or already redeemed code.')
                );
            }

            const user = await validateAccount(interaction);
            if (!user) return;

            addItem({
                accountId: user.userId,
                message: 'Code redeemed.',
                items: codeDoc.item,
                giftboxId: 'GiftBox:gb_makegood',
                quantity: 1,
                alert: true
            });

            codeDoc.redeemed = true;
            codeDoc.redeemedBy = user.userId;
            codeDoc.redeemedAt = new Date();
            await codeDoc.save();

            return createResponse(
                interaction,
                RESPONSES.SUCCESS(`Redeemed \`${codeDoc.item}\`.`)
            );
        }
    }
};
