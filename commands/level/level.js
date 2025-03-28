const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { MemberData, GuildSettings } = require('../../models/Level');
const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
const sharp = require('sharp');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level and XP.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to check.')
    ),
  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const guildData = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });

    if (!guildData) {
      return interaction.editReply({
        content:
          'Leveling system is not configured for this server yet. Please ask an admin to set it up.',
        flags: 64,
      });
    }

    if (!guildData.levelingEnabled) {
      return interaction.editReply({
        content: 'Leveling system is not enabled in this Server',
        flags: 64,
      });
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const statusTarget = interaction.options.getMember('user') || interaction.member;

    const memberData = await MemberData.findOne({
      guildId: interaction.guild.id,
      userId: targetUser.id,
    });

    if (!memberData) {
      return interaction.editReply({
        content: `${targetUser.username} has no level data.`,
        flags: 64,
      });
    }

    const xpNeeded = this.calculateXpNeeded(memberData.level, guildData);
    const progress = memberData.xp / xpNeeded;

    const canvasWidth = 934;
    const canvasHeight = 282;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d'); // ✅ Ensure ctx is defined before using it

    ctx.fillStyle = '#1C1F26';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    const innerStrokeColor = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeStyle = innerStrokeColor;
    ctx.lineWidth = 15;
    ctx.strokeRect(7.5, 7.5, canvas.width - 15, canvas.height - 15);

    const avatarUrl = targetUser.displayAvatarURL?.({
      extension: 'webp', 
      size: 256,
    });

    if (!avatarUrl) {
      console.error(`Failed to fetch avatar URL for ${targetUser.username}`);
      return interaction.editReply({
        content: `Could not retrieve avatar for ${targetUser.username}.`,
        flags: 64,
      });
    }

    try {
      console.log(`Fetching avatar: ${avatarUrl}`);

      const response = await fetch(avatarUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch avatar image: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer(); // 🔹 Fix: Use `arrayBuffer()` instead of `buffer()`
      if (!buffer || buffer.byteLength === 0) {
        throw new Error(`Avatar image buffer is empty.`);
      }

      console.log(`Avatar buffer length: ${buffer.byteLength}`);

      const pngBuffer = await sharp(Buffer.from(buffer)).toFormat('png').toBuffer(); // 🔹 Fix: Convert `ArrayBuffer` to `Buffer`
      if (!pngBuffer || pngBuffer.length === 0) {
        throw new Error(`Failed to convert avatar to PNG.`);
      }

      console.log(`Converted PNG buffer length: ${pngBuffer.length}`);

      const avatar = await loadImage(pngBuffer);
      if (!avatar) {
        throw new Error(`Failed to load image after conversion.`);
      }

      console.log(`Avatar loaded successfully`);

      const avatarSize = 200;
      const avatarX = 30;
      const avatarY = 42;

      ctx.save();
      ctx.beginPath();
      ctx.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      );
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      const statusColor = this.getStatusColor(interaction.guild.members.cache.get(targetUser.id)?.presence?.status); // 🔹 Fix: Ensure correct status fetching
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(
        avatarX + avatarSize - 45,
        avatarY + avatarSize - 25,
        20,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } catch (error) {
      console.error(`Failed to load or convert avatar image: ${error.message}`);
      return interaction.editReply({
        content: `Could not load avatar image for ${targetUser.username}.`,
        flags: 64,
      });
    }
    ctx.fillStyle = '#EAEAEA';
    ctx.font = 'bold 52px Arial, sans-serif';
    ctx.fillText(`${targetUser.username}`, 245, 110);
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText(`XP: ${memberData.xp} / ${xpNeeded}`, 245, 151);

    const leaderboardRank = await this.getLeaderboardRank(
      interaction.guild.id,
      memberData.level,
      memberData.xp
    );

    ctx.fillStyle = '#5E81AC';
    ctx.font = 'bold 40px Arial, sans-serif';

    const rankText = `Rank #${leaderboardRank}`;
    const levelText = `Level ${memberData.level}`;
    const rankTextWidth = ctx.measureText(rankText).width;
    const levelTextWidth = ctx.measureText(levelText).width;

    const maxX = canvasWidth - 40; // 🔹 Adjusted max width for better alignment
    const levelX = maxX - levelTextWidth;
    const rankX = Math.max(245, levelX - rankTextWidth - 20); // 🔹 Prevent overlap

    ctx.fillText(rankText, rankX, 60);
    ctx.fillText(levelText, levelX, 60);

    const progressBarWidth = 600;
    const progressBarHeight = 65;
    const progressBarX = 245;
    const progressBarY = 160;

    ctx.fillStyle = '#EAEAEA';
    this.roundRect(
      ctx,
      progressBarX,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      20
    );
    ctx.fill();

    if (progress > 0) {
      ctx.save();
      ctx.beginPath();
      this.roundRect(
        ctx,
        progressBarX,
        progressBarY,
        Math.max(1, Math.min(progress * progressBarWidth, progressBarWidth)), // 🔹 Prevents negative or 0 width
        progressBarHeight,
        20
      );
      ctx.fillStyle = '#43B581';
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#EAEAEA';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(
      `${Math.floor(progress * 100)}%`,
      progressBarX + progressBarWidth / 2 - 30,
      progressBarY + 47
    );

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { // 🔹 Ensured correct buffer format
      name: 'level.png', // 🔹 Changed to PNG for better quality
    });

    await interaction.editReply({
      content: `${targetUser.username}'s Level Information:`,
      files: [attachment],
    });
    },
    calculateXpNeeded(level, guildData) {
    return level === 1
      ? guildData.startingXp
      : guildData.startingXp + (level - 1) * guildData.xpPerLevel;
    },
    roundRect(ctx, x, y, width, height, radius) {
    const r = x + width;
    const b = y + height;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(r - radius, y);
    ctx.quadraticCurveTo(r, y, r, y + radius);
    ctx.lineTo(r, b - radius);
    ctx.quadraticCurveTo(r, b, r - radius, b);
    ctx.lineTo(x + radius, b);
    ctx.quadraticCurveTo(x, b, x, b - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
    return ctx;
    },
    getStatusColor(status) {
    switch (status) {
      case 'online':
        return '#43B581';
      case 'idle':
        return '#F9A825';
      case 'dnd':
        return '#E84118';
      case 'offline':
      default:
        return '#7E7B7A';
    }
    },
    async getLeaderboardRank(guildId, level, xp) {
    const leaderboard = await MemberData.find({ guildId: guildId })
      .sort({ level: -1, xp: -1 })
      .lean();
    const rank =
      leaderboard.findIndex(
        (user) =>
          user.level === level && user.guildId === guildId && user.xp === xp
      ) + 1;
    return rank > 0 ? rank : 'NA';
    },
    };
