const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const moment = require('moment');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Displays information about the bot.'),

  async execute(interaction) {
    const { client } = interaction;
    const totalGuilds = client.guilds.cache.size;
    const totalMembers = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0
    );
    const uptime = moment.duration(client.uptime).humanize();

    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
      2
    );
    const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);
    const cpuUsage = os.loadavg()[0].toFixed(2);
    const cpuModel = os.cpus()[0].model;
    const operatingSystem = `${os.type()} ${os.release()}`;

    const botInfoEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${client.user.username} - Bot Information`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: 'Developer',
          value: '```elm\nNeppixel\n```',
          inline: true,
        },
        {
          name: 'Servers',
          value: '```elm\n' + totalGuilds + '\n```',
          inline: true,
        },
        {
          name: 'Users',
          value: '```elm\n' + totalMembers + '\n```',
          inline: true,
        },
        {
          name: 'Uptime',
          value: '```elm\n' + uptime + '\n```',
          inline: true,
        },
        {
          name: 'CPU Usage',
          value: '```elm\n' + cpuUsage + '%\n```',
          inline: true,
        },
        {
          name: 'RAM Usage',
          value: '```elm\n' + memoryUsage + ' MB / ' + totalMemory + ' MB\n```',
          inline: true,
        },
        {
          name: 'CPU Model',
          value: '```elm\n' + cpuModel + '\n```',
          inline: true,
        },
        {
          name: 'Operating System',
          value: '```elm\n' + operatingSystem + '\n```',
          inline: true,
        },
        {
          name: 'Created On',
          value:
            '```elm\n' +
            moment(client.user.createdAt).format('MMMM Do YYYY, h:mm:ss A') +
            '\n```',
          inline: true,
        },
        {
          name: 'Library',
          value: '```elm\ndiscord.js v14\n```',
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const sourceCodeButton = new ButtonBuilder()
      .setLabel('Source Code')
      .setURL('https://github.com/birajrai/Lanya.git')
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(
      sourceCodeButton
    );

    await interaction.reply({ embeds: [botInfoEmbed], components: [row] });
  },
};
