const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bulkaddrole')
    .setDescription('Assign a role to up to 20 users at once')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('users')
        .setDescription('Mention or provide up to 20 user IDs separated by space')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const input = interaction.options.getString('users');

    if (!role.editable || role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ You can’t assign that role due to role hierarchy.', ephemeral: true });
    }

    const userIds = input.match(/\d{17,20}/g); // Extract mentions or raw IDs

    if (!userIds || userIds.length === 0) {
      return interaction.reply({ content: '❌ No valid user mentions or IDs found.', ephemeral: true });
    }

    if (userIds.length > 20) {
      return interaction.reply({ content: '⚠️ You can only assign roles to up to **20 users** at once.', ephemeral: true });
    }

    const added = [];
    const failed = [];

    for (const id of userIds) {
      try {
        const member = await interaction.guild.members.fetch(id);
        if (!member) {
          failed.push(`ID: ${id}`);
          continue;
        }

        await member.roles.add(role);
        added.push(member.user.tag);
      } catch (err) {
        failed.push(`ID: ${id}`);
      }
    }

    return interaction.reply({
      content: `✅ **${role.name}** added to: ${added.join(', ') || 'None'}\n❌ Failed: ${failed.join(', ') || 'None'}`,
      ephemeral: true
    });
  }
};
