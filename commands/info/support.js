const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('Get the support server link.'),

	async execute(interaction) {
		const supportServerLink = 'https://discord.gg/kAYpdenZ8b'; // Replace with your actual support server link

		const embed = new EmbedBuilder()
			.setTitle('🔹 Support Server')
			.setDescription('Need help? Join our support server using the button below!')
			.setColor('#ffcc00')
			.setTimestamp();

		const button = new ButtonBuilder()
			.setLabel('Join Support Server')
			.setStyle(ButtonStyle.Link)
			.setURL(supportServerLink);

		const row = new ActionRowBuilder().addComponents(button);

		await interaction.reply({ embeds: [embed], components: [row] }); // No ephemeral flag, so it's public
	},
};
