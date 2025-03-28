const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

// Emoji map for categories - makes your command look more visually appealing
const CATEGORY_EMOJIS = {
  Moderation: '🛡️',
  Utility: '🔧',
  Fun: '🎮',
  Music: '🎵',
  Level: '🏆',
  Admin: '🔒',
  Economy: '💰',
  Info: 'ℹ️',
  Minecraft: '⛏️',
  Uncategorized: '📁',
};

// Command emojis
const COMMAND_EMOJIS = {
  help: '❓',
  // Add more command-specific emojis as needed
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription(
      'Displays a list of commands or details about a specific command.'
    )
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('Get details about a specific command')
        .setAutocomplete(true)
    ),
  category: 'Utility', // Set the category for this command

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().trim().toLowerCase();
    const commandNames = [...interaction.client.commands.keys()];

    const filtered = commandNames
      .filter((name) => name.toLowerCase().includes(focusedValue)) // Changed from startsWith to includes for more flexible matching
      .slice(0, 25) // Increased from 10 to 25 for more options
      .map((name) => {
        const command = interaction.client.commands.get(name);
        const emoji = COMMAND_EMOJIS[name] || '📌';
        return {
          name: `${emoji} ${name} - ${command.data.description.slice(0, 50)}`,
          value: name,
        };
      });

    await interaction.respond(
      filtered.length
        ? filtered
        : [{ name: '❌ No matches found', value: 'none' }]
    );
  },

  async execute(interaction) {
    const { client } = interaction;

    try {
      await interaction.deferReply();

      const commandName = interaction.options.getString('command');
      const helpEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      if (commandName) {
        return this.sendCommandHelp(
          interaction,
          client,
          commandName,
          helpEmbed
        );
      } else {
        return this.sendHelpMenu(interaction, client, helpEmbed);
      }
    } catch (error) {
      console.error('Error in help command:', error);
      return interaction
        .editReply({
          content:
            '❌ An error occurred while processing your request. Please try again later.',
        })
        .catch(console.error);
    }
  },

  async sendCommandHelp(interaction, client, commandName, embed) {
    try {
      const command = client.commands.get(commandName);
      if (!command) {
        return interaction.editReply({
          content:
            '❌ The command you entered was not found. Try using `/help` to see the available commands.',
        });
      }

      // Get options if any
      const options =
        command.data.options
          ?.map((opt) => {
            const required = opt.required ? '(required)' : '(optional)';
            return `\`${opt.name}\` ${required}: ${opt.description}`;
          })
          .join('\n') || 'No options available.';

      const categoryEmoji = command.category
        ? CATEGORY_EMOJIS[
            command.category.charAt(0).toUpperCase() +
              command.category.slice(1).toLowerCase()
          ] || '📁'
        : '📁';

      const commandEmoji = COMMAND_EMOJIS[command.data.name] || '📌';

      embed
        .setTitle(`${commandEmoji} **Command Details: /${command.data.name}**`)
        .setDescription(command.data.description || 'No description available.')
        .addFields(
          {
            name: '🛠️ Usage',
            value: `\`/${command.data.name}${command.data.options?.length ? ' [options]' : ''}\``,
          },
          {
            name: '📂 Category',
            value: `${categoryEmoji} ${command.category || 'Uncategorized'}`,
          },
          {
            name: '⌨️ Options',
            value: options,
          }
        );

      // Add a "back to menu" button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('help-back')
          .setLabel('Back to Help Menu')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('↩️')
      );

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      // Collector for the back button
      const filter = (i) =>
        i.customId === 'help-back' && i.user.id === interaction.user.id;
      const collector = reply.createMessageComponentCollector({
        filter,
        time: 60000,
        componentType: ComponentType.Button,
      });

      collector.on('collect', async (i) => {
        await i.deferUpdate();
        await this.sendHelpMenu(interaction, client, embed);
      });

      return reply;
    } catch (error) {
      console.error('Error in sendCommandHelp:', error);
      return interaction
        .editReply({
          content:
            '❌ An error occurred while displaying command help. Please try again later.',
        })
        .catch(console.error);
    }
  },

  async sendHelpMenu(interaction, client, embed) {
    try {
      const categories = this.getCommandCategories(client);

      if (Object.keys(categories).length === 0) {
        return interaction.editReply({
          content: '⚠️ No commands available.',
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help-menu')
        .setPlaceholder('Select a category')
        .addOptions(
          Object.keys(categories).map((category) => {
            const emoji = CATEGORY_EMOJIS[category] || '📁';
            return {
              label: category,
              value: category,
              description: `${categories[category].length} commands in ${category}`,
              emoji: emoji,
            };
          })
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      embed
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTitle('✨ Bot Help Menu')
        .setDescription(
          'Use the dropdown menu below to explore commands by category. For specific command details, use `/help command:commandname`.'
        )
        .setFields(
          Object.entries(categories).map(([category, commands]) => {
            const emoji = CATEGORY_EMOJIS[category] || '📁';
            return {
              name: `${emoji} ${category}`,
              value: `${commands.length} command${commands.length === 1 ? '' : 's'} available`,
              inline: true,
            };
          })
        );

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      this.createCollector(interaction, categories, row, reply);
      return reply;
    } catch (error) {
      console.error('Error in sendHelpMenu:', error);
      return interaction
        .editReply({
          content:
            '❌ An error occurred while displaying the help menu. Please try again later.',
        })
        .catch(console.error);
    }
  },

  getCommandCategories(client) {
    const categories = {};
    client.commands.forEach((cmd) => {
      const category = cmd.category
        ? cmd.category.charAt(0).toUpperCase() +
          cmd.category.slice(1).toLowerCase()
        : 'Uncategorized';
      if (!categories[category]) categories[category] = [];
      categories[category].push(cmd.data.name);
    });
    return categories;
  },

  createCollector(interaction, categories, row, reply) {
    try {
      // Create a collector for the message reply
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect, // Use ComponentType instead of the magic number
        time: 120000, // Increased timeout to 2 minutes
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on('collect', async (i) => {
        try {
          await i.deferUpdate();

          const selectedCategory = i.values[0];
          const commandsInCategory = categories[selectedCategory];
          const categoryEmoji = CATEGORY_EMOJIS[selectedCategory] || '📁';

          const commandsList =
            commandsInCategory
              .map((cmdName) => {
                const cmd = interaction.client.commands.get(cmdName);
                const cmdEmoji = COMMAND_EMOJIS[cmdName] || '📌';
                return `> ${cmdEmoji} \`/${cmdName}\` - ${cmd?.data?.description || 'No description available.'}`;
              })
              .join('\n') || 'No commands available.';

          const categoryEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${categoryEmoji} **${selectedCategory} Commands**`)
            .setDescription(
              `Select a command from the list below or use \`/help command:commandname\` for details.\n\n${commandsList}`
            )
            .setFooter({
              text: `Requested by ${interaction.user.tag} • Page 1/${Math.ceil(commandsInCategory.length / 10)}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

          await i.editReply({ embeds: [categoryEmbed], components: [row] });
        } catch (error) {
          console.error('Error handling select menu interaction:', error);
          await i
            .editReply({
              content:
                '❌ An error occurred while processing your selection. Please try again.',
            })
            .catch(console.error);
        }
      });

      collector.on('end', async () => {
        try {
          // Make sure the message exists and is still editable
          const fetchedMessage = await interaction
            .fetchReply()
            .catch(() => null);
          if (fetchedMessage) {
            const expiredEmbed = EmbedBuilder.from(fetchedMessage.embeds[0]);

            if (expiredEmbed) {
              expiredEmbed.setFooter({
                text: `Help menu expired • Run /help again for more information`,
                iconURL: interaction.user.displayAvatarURL(),
              });

              await interaction
                .editReply({
                  embeds: [expiredEmbed],
                  components: [],
                })
                .catch((err) =>
                  console.error('Failed to update expired menu:', err)
                );
            } else {
              await interaction
                .editReply({
                  components: [],
                  content:
                    '⌛ Help menu has expired. Run `/help` again if you need more information.',
                })
                .catch((err) =>
                  console.error('Failed to update expired menu:', err)
                );
            }
          }
        } catch (error) {
          console.error('Error handling collector end:', error);
        }
      });
    } catch (error) {
      console.error('Error creating collector:', error);
    }
  },
};
