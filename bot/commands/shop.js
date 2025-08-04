const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('path');
const { generateShop } = require('../../backend/routes/storefront');
const { requireAdmin, createResponse, RESPONSES } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Manipulate the item shop through various means.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh')
                .setDescription('Refresh the item shop.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear the item shop.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (!(await requireAdmin(interaction))) return;

        if (subcommand === 'refresh') {
            try {
                await generateShop();
                console.log(`Shop refreshed by ${interaction.user.globalName || interaction.user.username}`);
                return createResponse(interaction, RESPONSES.SUCCESS('The item shop has been refreshed!'));
            } catch (err) {
                console.error(err);
                return createResponse(interaction, RESPONSES.ERROR('An error occurred while refreshing the shop.'));
            }
        }

        if (subcommand === 'clear') {
            const shopPath = path.join(__dirname, '../../backend/jsons/storefront.json');
            const safeShopPath = path.join(__dirname, '../../backend/jsons/storefront_safe.json');
            const emptyShop = JSON.parse(fs.readFileSync(path.join(__dirname, '../../backend/jsons/templates/storefront.json'), 'utf-8'));

            fs.writeFileSync(shopPath, JSON.stringify(emptyShop, null, 4), 'utf-8');
            fs.writeFileSync(safeShopPath, JSON.stringify(emptyShop, null, 4), 'utf-8');
            console.log(`Shop cleared by ${interaction.user.globalName || interaction.user.username}`);

            return createResponse(interaction, RESPONSES.SUCCESS('The item shop has been cleared.'));
        }
    },
};