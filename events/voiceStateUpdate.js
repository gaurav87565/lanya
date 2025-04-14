const { Events } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const client = oldState.client;
        const player = client.lavalink.players.get(oldState.guild.id);

        if (!player) return;

        
        if (oldState.id === client.user.id && !newState.channelId) {
            player.destroy();
            return;
        }

        const voiceChannel = oldState.guild.channels.cache.get(player.voiceChannelId);
        if (!voiceChannel) return;

        
        const members = voiceChannel.members.filter(member => !member.user.bot).size;

        if (members === 0) {
            
            player.inactivityTimeout = setTimeout(() => {
                if (player.playing) player.stopPlaying();
                player.destroy();
                
                const textChannel = oldState.guild.channels.cache.get(player.textChannelId);
                if (textChannel) {
                    textChannel.send('👋 Left the voice channel due to inactivity (3 minutes with no listeners)');
                }
            }, 180000); 
        } else if (player.inactivityTimeout) {
            
            clearTimeout(player.inactivityTimeout);
            player.inactivityTimeout = null;
        }
    }
}