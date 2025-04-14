const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('Give a role to a user.')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to give the role to.').setRequired(true))
    .addRoleOption(option =>
      option.setName('role').setDescription('The role to assign.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ I do not have permission to manage roles.', ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: '❌ I cannot assign a role higher than or equal to my highest role.', ephemeral: true });
    }

    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `⚠️ ${user.username} already has that role.`, ephemeral: true });
    }

    await member.roles.add(role);
    await interaction.reply({ content: `✅ Role ${role.name} added to ${user.username}.` });
  },
};
