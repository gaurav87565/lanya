const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const Playlist = require('../../../models/Playlist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Manage music playlists')
    .addSubcommand(sub => 
      sub.setName('create')
        .setDescription('Create a new playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        .addBooleanOption(opt => opt.setName('public').setDescription('Make playlist public'))
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a song to your playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Song title').setRequired(true))
        .addStringOption(opt => opt.setName('url').setDescription('Song URL').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View songs in a playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a song from your playlist')
        .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Song title to remove').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ✅ CREATE
    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const isPublic = interaction.options.getBoolean('public') || false;
  
    // Updated check: Ensure unique playlist names *per user*
    const existing = await Playlist.findOne({ name, userId });
    if (existing) return interaction.reply({ content: '❌ You already have a playlist with this name.', ephemeral: true });
  
    await Playlist.create({
      name,
      userId,
      isPublic,
      songs: []
    });
  
    return interaction.reply(`✅ Created ${isPublic ? '**public**' : '**private**'} playlist **${name}**.`);
  }
  
  

    // ✅ ADD SONG
    if (sub === 'add') {
      const name = interaction.options.getString('name');
      const title = interaction.options.getString('title');
      const url = interaction.options.getString('url');

      const playlist = await Playlist.findOne({ name });
      if (!playlist) return interaction.reply({ content: '❌ Playlist not found.', ephemeral: true });

      if (playlist.userId !== userId) {
        return interaction.reply({ content: '❌ Only the owner can add songs to this playlist.', ephemeral: true });
      }

      playlist.songs.push({ title, url });
      await playlist.save();
      return interaction.reply(`🎵 Added **${title}** to **${name}**.`);
    }

    // ✅ VIEW SONGS
    if (sub === 'view') {
      const name = interaction.options.getString('name');
      const playlist = await Playlist.findOne({ name });
      if (!playlist) return interaction.reply({ content: '❌ Playlist not found.', ephemeral: true });

      if (!playlist.isPublic && playlist.userId !== userId) {
        return interaction.reply({ content: '❌ This playlist is private.', ephemeral: true });
      }

      if (playlist.songs.length === 0) {
        return interaction.reply({ content: '⚠️ This playlist has no songs.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎶 ${playlist.name} (${playlist.isPublic ? 'Public' : 'Private'})`)
        .setDescription(playlist.songs.map((s, i) => `**${i + 1}.** [${s.title}](${s.url})`).join('\n'))
        .setFooter({ text: `Owner: ${interaction.client.users.cache.get(playlist.userId)?.tag || 'Unknown'}` });

      return interaction.reply({ embeds: [embed] });
    }

    // ✅ REMOVE SONG
    if (sub === 'remove') {
      const name = interaction.options.getString('name');
      const title = interaction.options.getString('title');

      const playlist = await Playlist.findOne({ name });
      if (!playlist) return interaction.reply({ content: '❌ Playlist not found.', ephemeral: true });

      if (playlist.userId !== userId) {
        return interaction.reply({ content: '❌ Only the owner can remove songs.', ephemeral: true });
      }

      const before = playlist.songs.length;
      playlist.songs = playlist.songs.filter(s => s.title !== title);
      await playlist.save();

      if (playlist.songs.length === before) {
        return interaction.reply({ content: `❌ Song **${title}** not found in the playlist.`, ephemeral: true });
      }

      return interaction.reply(`🗑️ Removed **${title}** from **${name}**.`);
    }

    // ✅ MAIN PAGE - LIST PUBLIC PLAYLISTS + Private Toggle
    const publicPlaylists = await Playlist.find({ isPublic: true });

    if (!publicPlaylists.length) {
      return interaction.reply({ content: '❌ No public playlists found.', ephemeral: true });
    }

    const options = publicPlaylists.map(p => ({
      label: p.name,
      description: `By ${interaction.client.users.cache.get(p.userId)?.tag || 'Unknown'}`,
      value: p.name
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_public_playlist')
      .setPlaceholder('Select a public playlist')
      .addOptions(options.slice(0, 25)); // Max 25 options

    const row = new ActionRowBuilder().addComponents(select);
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📁 View My Private Playlists')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('view_private_playlists')
    );

    await interaction.reply({
      content: `📂 **Public Playlists** (${publicPlaylists.length}):`,
      components: [row, button],
      ephemeral: true
    });
  }
};
