const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('multiplerole')
    .setDescription('Give multiple roles to a user.')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to give roles to.').setRequired(true))
    .addRoleOption(option =>
      option.setName('role1').setDescription('Role 1').setRequired(true))
    .addRoleOption(option =>
      option.setName('role2').setDescription('Role 2').setRequired(false))
    .addRoleOption(option =>
      option.setName('role3').setDescription('Role 3').setRequired(false))
    .addRoleOption(option =>
      option.setName('role4').setDescription('Role 4').setRequired(false))
    .addRoleOption(option =>
      option.setName('role5').setDescription('Role 5').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const rolesToAdd = [];

    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) {
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({ content: `❌ Cannot assign role: ${role.name} is higher than my highest role.`, ephemeral: true });
        }
        if (!member.roles.cache.has(role.id)) {
          rolesToAdd.push(role);
        }
      }
    }

    if (!rolesToAdd.length) {
      return interaction.reply({ content: '⚠️ No valid new roles to assign.', ephemeral: true });
    }

    await member.roles.add(rolesToAdd);
    await interaction.reply({
      content: `✅ Added ${rolesToAdd.map(r => `\`${r.name}\``).join(', ')} to ${user.username}.`,
    });
  },
};
