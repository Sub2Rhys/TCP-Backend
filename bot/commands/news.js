const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Servers } = require('../../models/mongoose');
const { requireAdmin, createResponse, extractOptions, RESPONSES, isAdmin, isHoster } = require('../utils/helper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('View the news feed.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add to the news feed in-game.')
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('The title of the news.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('The description of the news.')
                        .setRequired(true)
                )
                .addAttachmentOption(option =>
                    option
                        .setName('image')
                        .setDescription('The image for the news.')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the news feed.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const options = extractOptions(interaction, [
            { key: 'title', type: 'string' },
            { key: 'description', type: 'string' }
        ]);
        const { title, description } = options;
        const userId = interaction.user.id;

        if (subcommand === 'add') {
            const attachment = interaction.options.getAttachment('image');

            if (!isAdmin(userId) && !isHoster(interaction)) {
                return createResponse(interaction, RESPONSES.ERROR('You must be an administrator and/or hoster to use this command.'));
            }

            if (attachment) {
                const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
                if (!allowedTypes.includes(attachment.contentType)) {
                    return createResponse(interaction, RESPONSES.ERROR('Please upload a valid image file (PNG or JPG).'));
                }
            }

            const resizedImageUrl = attachment
                ? `https://images.weserv.nl/?url=${encodeURIComponent(attachment.url)}&w=192`
                : null;

            const newsMessage = {
                image: resizedImageUrl,
                hidden: false,
                messagetype: 'normal',
                _type: 'CommonUI Simple Message Base',
                title,
                body: description,
                spotlight: false,
                createdAt: new Date()
            };

            try {
                let userServers = await Servers.findOne({ userId });

                if (!userServers) {
                    userServers = new Servers({
                        userId,
                        news: [newsMessage]
                    });
                } else {
                    userServers.news.push(newsMessage);
                    userServers.updatedAt = new Date();
                }

                await userServers.save();

                const embed = await require('../createEmbed.js')(interaction);
                embed.setColor('Green')
                    .setTitle('News Updated')
                    .setDescription(`**${title}**\n${description}`);

                if (attachment) {
                    embed.setThumbnail(attachment.url.replace(/(w|h)=\d+/g, '$1=512'));
                }

                return interaction.reply({ embeds: [embed] });
            } catch {
                return createResponse(interaction, RESPONSES.ERROR('Failed to save the news message. Please try again.'));
            }
        }

        if (subcommand === 'view') {
            try {
                const userServers = await Servers.findOne({ userId });
                const newsMessages = userServers?.news || [];

                if (newsMessages.length === 0) {
                    return createResponse(interaction, RESPONSES.WARNING('There are no news messages available to display.'));
                }

                let currentPage = 0;

                const createButtons = (page) => {
                    return new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('previous')
                                .setLabel('⬅️')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === 0),
                            new ButtonBuilder()
                                .setCustomId('delete')
                                .setLabel('🗑️')
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(!isAdmin(userId)),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('➡️')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === newsMessages.length - 1)
                        );
                };

                const news = newsMessages[currentPage];
                const embed = await require('../createEmbed.js')(interaction);
                embed.setColor('Blue')
                    .setTitle('Current News')
                    .setDescription(`**${news.title}**\n${news.body}`)
                    .setFooter({ text: `Page ${currentPage + 1} of ${newsMessages.length}` });

                if (news.image) {
                    embed.setThumbnail(news.image.replace(/(w|h)=\d+/g, '$1=512'));
                }

                await interaction.reply({
                    embeds: [embed],
                    components: [createButtons(currentPage)]
                });

                const filter = (i) => i.user.id === userId;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async (i) => {
                    try {
                        if (i.customId === 'previous' && currentPage > 0) {
                            currentPage--;
                        } else if (i.customId === 'next' && currentPage < newsMessages.length - 1) {
                            currentPage++;
                        } else if (i.customId === 'delete' && isAdmin(userId)) {
                            try {
                                newsMessages.splice(currentPage, 1);

                                await Servers.findOneAndUpdate(
                                    { userId },
                                    {
                                        news: newsMessages,
                                        updatedAt: new Date()
                                    }
                                );

                                if (newsMessages.length === 0) {
                                    return createResponse(i, {
                                        color: 'Red',
                                        title: 'No News Left',
                                        description: 'There are no news messages left to display.'
                                    }, false, true);
                                }

                                if (currentPage >= newsMessages.length) {
                                    currentPage = newsMessages.length - 1;
                                }
                            } catch {
                                return i.reply({
                                    content: 'Failed to delete the news message. Please try again.',
                                    ephemeral: true
                                });
                            }
                        }

                        const currentNews = newsMessages[currentPage];
                        const updatedEmbed = await require('../createEmbed.js')(interaction);
                        updatedEmbed.setColor('Blue')
                            .setTitle('Current News')
                            .setDescription(`**${currentNews.title}**\n${currentNews.body}`)
                            .setFooter({ text: `Page ${currentPage + 1} of ${newsMessages.length}` });

                        if (currentNews.image) {
                            updatedEmbed.setThumbnail(currentNews.image.replace(/(w|h)=\d+/g, '$1=512'));
                        }

                        await i.update({
                            embeds: [updatedEmbed],
                            components: [createButtons(currentPage)]
                        });
                    } catch {
                        try {
                            await i.reply({
                                content: 'Something went wrong handling your button. Please try again later.',
                                ephemeral: true
                            });
                        } catch {}
                    }
                });

                collector.on('end', async () => {
                    try {
                        const disabledRow = createButtons(currentPage);
                        disabledRow.components.forEach((button) => button.setDisabled(true));
                        await interaction.editReply({ components: [disabledRow] });
                    } catch {}
                });
            } catch {
                return createResponse(interaction, RESPONSES.ERROR('Failed to fetch news messages. Please try again.'));
            }
        }
    },
};