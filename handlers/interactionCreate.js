client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  
    if (interaction.customId === 'view_private_playlists') {
      const playlists = await Playlist.find({ userId: interaction.user.id, isPublic: false });
  
      if (!playlists.length) {
        return interaction.reply({ content: '❌ You have no private playlists.', ephemeral: true });
      }
  
      const list = playlists.map(p => `• ${p.name} (${p.songs.length} songs)`).join('\n');
      return interaction.reply({ content: `🔒 **Your Private Playlists**:\n${list}`, ephemeral: true });
    }
  
    if (interaction.customId === 'select_public_playlist') {
      const selected = interaction.values[0];
      const playlist = await Playlist.findOne({ name: selected });
      if (!playlist) return interaction.reply({ content: '❌ Playlist not found.', ephemeral: true });
  
      const desc = playlist.songs.length
        ? playlist.songs.map((s, i) => `**${i + 1}.** [${s.title}](${s.url})`).join('\n')
        : '_No songs in this playlist._';
  
      const embed = new EmbedBuilder()
        .setTitle(`🎧 ${playlist.name}`)
        .setDescription(desc)
        .setFooter({ text: `Created by: ${interaction.client.users.cache.get(playlist.userId)?.tag || 'Unknown'}` });
  
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  });
  