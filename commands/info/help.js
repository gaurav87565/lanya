const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

const CATEGORY_EMOJIS = {
  Moderation: '🛡️',
  Utility: '🧰',
  Fun: '🎮',
  Music: '🎵',
  Level: '📈',
  Admin: '🔐',
  Economy: '💰',
  Info: 'ℹ️',
  Minecraft: '⛏️',
  Uncategorized: '📁',
};

const COMMAND_EMOJIS = {
  help: '❓',
  // Add more if you like
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all commands or detailed info about a specific one.')
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('See info about a specific command')
        .setAutocomplete(true)
    ),
  category: 'Utility',

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const allCommands = [...interaction.client.commands.values()];

    const filtered = allCommands
      .filter((cmd) => cmd.data.name.includes(focused))
      .slice(0, 25)
      .map((cmd) => ({
        name: `${COMMAND_EMOJIS[cmd.data.name] || '📌'} ${cmd.data.name}`,
        value: cmd.data.name,
      }));

    await interaction.respond(filtered.length ? filtered : [
      { name: '❌ No command found', value: 'none' },
    ]);
  },

  async execute(interaction) {
    const { client } = interaction;
    const inputCommand = interaction.options.getString('command');
    await interaction.deferReply();

    const baseEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    if (inputCommand) {
      const command = client.commands.get(inputCommand);
      if (!command) {
        return interaction.editReply({ content: '❌ Command not found.' });
      }

      const emoji = COMMAND_EMOJIS[command.data.name] || '📌';
      const options =
        command.data.options?.map(opt =>
          `\`${opt.name}\` (${opt.required ? 'required' : 'optional'}): ${opt.description}`
        ).join('\n') || 'No options';

      baseEmbed
        .setTitle(`${emoji} /${command.data.name}`)
        .setDescription(command.data.description || 'No description.')
        .addFields(
          { name: '🛠 Usage', value: `\`/${command.data.name}${command.data.options?.length ? ' [options]' : ''}\`` },
          { name: '📂 Category', value: `${CATEGORY_EMOJIS[command.category] || '📁'} ${command.category || 'Uncategorized'}` },
          { name: '⚙ Options', value: options }
        );

      const backBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('help-back')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('↩️')
      );

      const reply = await interaction.editReply({ embeds: [baseEmbed], components: [backBtn] });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on('collect', async (i) => {
        await i.deferUpdate();
        this.sendCategoryMenu(interaction, client, baseEmbed);
      });

      return;
    }

    this.sendCategoryMenu(interaction, client, baseEmbed);
  },

  async sendCategoryMenu(interaction, client, embed) {
    const categories = this.getCategories(client);

    embed
      .setTitle('📚 Help Menu')
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription('Use the dropdown below to select a category and explore the commands.');

    const dropdown = new StringSelectMenuBuilder()
      .setCustomId('help-category')
      .setPlaceholder('📂 Choose a command category')
      .addOptions(
        Object.entries(categories).map(([name, commands]) => ({
          label: name,
          value: name,
          description: `${commands.length} command(s) in ${name}`,
          emoji: CATEGORY_EMOJIS[name] || '📁',
        }))
      );

    const row = new ActionRowBuilder().addComponents(dropdown);

    const reply = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 2 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      const selected = i.values[0];
      const cmds = categories[selected];

      const categoryEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${CATEGORY_EMOJIS[selected] || '📁'} ${selected} Commands`)
        .setDescription(cmds.map(cmdName => {
          const cmd = client.commands.get(cmdName);
          const emoji = COMMAND_EMOJIS[cmdName] || '📌';
          return `> ${emoji} \`/${cmdName}\` - ${cmd.data.description || 'No description.'}`;
        }).join('\n'))
        .setFooter({ text: `Requested by ${i.user.tag}`, iconURL: i.user.displayAvatarURL() })
        .setTimestamp();

      await i.update({ embeds: [categoryEmbed], components: [row] });
    });

    collector.on('end', async () => {
      try {
        const expiredEmbed = EmbedBuilder.from(embed)
          .setFooter({ text: '⏰ Help menu expired. Run /help again.', iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [expiredEmbed], components: [] });
      } catch (e) {
        console.error('Error updating after collector ended:', e);
      }
    });
  },

  getCategories(client) {
    const result = {};
    client.commands.forEach((cmd) => {
      const category = cmd.category
        ? cmd.category.charAt(0).toUpperCase() + cmd.category.slice(1).toLowerCase()
        : 'Uncategorized';
      if (!result[category]) result[category] = [];
      result[category].push(cmd.data.name);
    });
    return result;
  },
};
