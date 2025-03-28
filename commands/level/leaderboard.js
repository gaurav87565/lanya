const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { MemberData, GuildSettings } = require('../../models/Level');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard based on levels and XP.'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildData = await GuildSettings.findOne({ guildId: interaction.guild.id });

    if (!guildData || !guildData.levelingEnabled) {
      return interaction.editReply({ content: '❌ Leveling system is not enabled in this server.' });
    }

    const leaderboard = await MemberData.find({ guildId: interaction.guild.id })
      .sort({ level: -1, xp: -1 })
      .lean();

    if (leaderboard.length === 0) {
      return interaction.editReply({ content: 'No members found in the leaderboard.' });
    }

    const topMembers = leaderboard.slice(0, 10);
    const canvasWidth = 950;
    const canvasHeight = 600;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1E1E2E'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // **Border**
    ctx.strokeStyle = '#FFD700'; // Gold color for border
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // **Trophy Image**
    const trophy = await loadImage('https://img.freepik.com/free-vector/golden-winners-cup_1284-18399.jpg'); // Replace with a valid trophy emoji image URL
    ctx.drawImage(trophy, 30, 30, 60, 60); // Position and size

    // Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 50px Arial, sans-serif';
    ctx.fillText('Leaderboard', 100, 80); // Adjusted to not overlap with trophy

    // Column Titles
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('Rank', 40, 130);
    ctx.fillText('User', 140, 130);
    ctx.fillText('Level', 500, 130);
    ctx.fillText('XP', 700, 130);

    // Draw leaderboard rows
    for (let index = 0; index < topMembers.length; index++) {
      const member = topMembers[index];

      let userTag = 'Unknown User';
      let avatarURL = 'https://cdn.discordapp.com/embed/avatars/0.png'; // Default avatar

      try {
        const user = await interaction.client.users.fetch(member.userId);
        if (user) {
          userTag = user.tag;
          avatarURL = user.displayAvatarURL({ format: 'png', size: 64 });
        }
      } catch (err) {
        console.error(`Failed to fetch user ${member.userId}:`, err);
      }

      const y = 180 + index * 50;

      // Draw rank number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText(`#${index + 1}`, 40, y);

      // Load and draw avatar
      try {
        const avatar = await loadImage(avatarURL);
        ctx.drawImage(avatar, 100, y - 30, 40, 40); // Position and size of avatar
      } catch (err) {
        console.error(`Failed to load avatar for ${member.userId}:`, err);
      }

      // Draw user name
      ctx.fillText(userTag, 160, y);

      // Draw level and XP
      ctx.fillText(`${member.level}`, 500, y);
      ctx.fillText(`${member.xp}`, 700, y);
    }

    // Convert canvas to buffer
    const buffer = await canvas.encode('png');

    // Send image
    const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });

    await interaction.editReply({
      content: 'Here is the current leaderboard:',
      files: [attachment],
    });
  },
};
