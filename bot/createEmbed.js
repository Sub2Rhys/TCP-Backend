const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    return new EmbedBuilder()
        .setTimestamp()
        .setFooter({
            text: interaction.user.globalName || interaction.user.username,
            iconURL: interaction.user.displayAvatarURL(),
        });
};