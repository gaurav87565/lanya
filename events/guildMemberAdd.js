const { Events, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const Welcome = require('../models/welcome');
const AutoRole = require('../models/AutoRoles');

function getOrdinalSuffix(number) {
  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const autoRole = await AutoRole.findOne({ serverId: member.guild.id });
      const welcomeData = await Welcome.findOne({ serverId: member.guild.id });

      if (!welcomeData || !welcomeData.enabled || !welcomeData.channelId) return;

      const canvas = createCanvas(1920, 1080);
      const ctx = canvas.getContext('2d');

      // Load background
      const background = await loadImage(path.join(__dirname, '../utils/welcome-background.png'));
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      // Load avatar
      const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
      const centerX = 960;
      const centerY = 350;
      const radius = 250;

      // Add dark background behind avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();
      ctx.restore();

      // Clip and draw avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
      ctx.restore();

      // Add avatar border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Member info
      const memberCount = member.guild.memberCount;
      const ordinalSuffix = getOrdinalSuffix(memberCount);

      let description = welcomeData.description || 'Welcome {member} to {server}';
      description = description
        .replace(/{member}/g, member.user)
        .replace(/{server}/g, member.guild.name)
        .replace(/{serverid}/g, member.guild.id)
        .replace(/{userid}/g, member.user.id)
        .replace(/{joindate}/g, `<t:${Math.floor((member.joinedAt || Date.now()) / 1000)}:F>`)
        .replace(/{accountage}/g, `<t:${Math.floor(member.user.createdAt / 1000)}:R>`)
        .replace(/{membercount}/g, memberCount)
        .replace(/{serverage}/g, `<t:${Math.floor(member.guild.createdAt / 1000)}:R>`);

      // Add welcome text
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 15;
      ctx.font = 'bold 150px Arial'; // Use system font
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.fillText('Welcome', canvas.width / 2, 750);

      ctx.font = '100px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${member.user.username}`, canvas.width / 2, 850);

      ctx.font = '80px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`You are our ${memberCount}${ordinalSuffix} Member!`, canvas.width / 2, 950);

      // Send welcome image
      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome.png' });
      const welcomeChannel = member.guild.channels.cache.get(welcomeData.channelId);
      if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor('#00BFFF')
          .setDescription(description)
          .setImage('attachment://welcome.png')
          .setTimestamp();

        welcomeChannel.send({ embeds: [welcomeEmbed], files: [attachment] });
      }

      // Assign auto roles
      if (!autoRole || autoRole.roleIds.length === 0) return;
      for (const roleId of autoRole.roleIds) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          try {
            await member.roles.add(role);
          } catch (error) {
            console.error('Failed to assign role:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling guildMemberAdd:', error);
    }
  },
};
