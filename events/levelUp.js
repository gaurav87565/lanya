const { Events } = require('discord.js');
const { GuildSettings, MemberData, LevelRoles } = require('../models/Level');

const cooldowns = new Map();
const messageTimestamps = new Map();

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guildData = await GuildSettings.findOne({ guildId: message.guild.id });
    if (!guildData || !guildData.levelingEnabled) return;

    const messageCooldown = 3000;
    const xpRate = guildData.xpRate || 1;
    const currentTime = Date.now();
    const lastMessageTime = messageTimestamps.get(message.author.id);

    if (lastMessageTime && currentTime - lastMessageTime < messageCooldown) return;
    messageTimestamps.set(message.author.id, currentTime);

    const xpToAdd = Math.floor(Math.random() * 10 + 5) * xpRate;

    let memberData = await MemberData.findOne({
      guildId: message.guild.id,
      userId: message.author.id,
    });

    if (!memberData) {
      memberData = new MemberData({
        guildId: message.guild.id,
        userId: message.author.id,
        level: 1,
        xp: 0,
        totalXp: 0,
      });
    }

    memberData.xp += xpToAdd;
    memberData.totalXp += xpToAdd;

    const calculateXpNeeded = (level) => {
      if (level === 1) return guildData.startingXp || 100;
      return (guildData.startingXp || 100) + (level - 1) * (guildData.xpPerLevel || 50);
    };

    let previousLevel = memberData.level;
    let levelUpCount = 0;

    while (memberData.xp >= calculateXpNeeded(memberData.level)) {
      memberData.xp -= calculateXpNeeded(memberData.level);
      memberData.level++;
      levelUpCount++;
    }

    if (levelUpCount > 0) {
      const cooldownTime = 5000;
      const userId = message.author.id;

      if (!cooldowns.has(userId) || currentTime - cooldowns.get(userId) > cooldownTime) {
        cooldowns.set(userId, currentTime);
        await module.exports.notifyLevelUp(message, memberData.level, guildData);
      }

      await module.exports.assignRoles(message, previousLevel + 1, memberData.level);
    }

    await memberData.save();
  },

  notifyLevelUp: async (message, level, guildData) => {
    try {
      let channel = message.channel;

      if (guildData.levelUpChannelId) {
        const target = message.guild.channels.cache.get(guildData.levelUpChannelId);
        if (target && target.isTextBased()) channel = target;
      }

      if (!channel || !channel.send) {
        console.warn(`No valid level-up channel found for guild ${message.guild.id}`);
        return;
      }

      await channel.send(`${message.author} has leveled up to level **${level}**! 🎉`);
    } catch (err) {
      console.error('Level-up message failed:', err.message);
    }
  },

  assignRoles: async (message, startLevel, endLevel) => {
    try {
      const member = await message.guild.members.fetch(message.author.id);

      const rolesToAdd = await LevelRoles.find({
        guildId: message.guild.id,
        level: { $gte: startLevel, $lte: endLevel },
      });

      const additionalRoles = await LevelRoles.find({
        guildId: message.guild.id,
        level: { $lt: startLevel },
      });

      const allRoles = [...rolesToAdd, ...additionalRoles];
      const roleChunks = [];

      for (let i = 0; i < allRoles.length; i += 20) {
        roleChunks.push(allRoles.slice(i, i + 20)); // split into chunks of 20
      }

      for (const chunk of roleChunks) {
        const promises = chunk.map(async (roleData) => {
          const role = message.guild.roles.cache.get(roleData.roleId);
          if (role) {
            try {
              await member.roles.add(role);
            } catch (err) {
              console.error(`Error adding role ${role.name} to ${member.user.tag}:`, err.message);
            }
          }
        });

        await Promise.all(promises);
      }
    } catch (err) {
      console.error('Error assigning roles:', err.message);
    }
  },
};
