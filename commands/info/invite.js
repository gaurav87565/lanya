const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Get the invite link for the bot.'),

	async execute(interaction) {
		const inviteLink = `https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;

		const embed = new EmbedBuilder()
			.setTitle('🔹 Invite Link')
			.setDescription('Click the button below to invite the bot to your server!')
			.setColor('#3498db')
			.setTimestamp();

		const button = new ButtonBuilder()
			.setLabel('Invite Bot')
			.setStyle(ButtonStyle.Link)
			.setURL(inviteLink);

		const row = new ActionRowBuilder().addComponents(button);

		// Send the message publicly
		await interaction.reply({ embeds: [embed], components: [row] });
	},
};
