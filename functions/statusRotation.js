const { ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

function updateStatus(client) {
  try {
    // Load status configuration from status.json in root directory
    const statusConfigPath = path.join(process.cwd(), 'status.json');
    const statusConfig = JSON.parse(fs.readFileSync(statusConfigPath, 'utf8'));
    
    const status = statusConfig.status;
    const interval = statusConfig.interval;
    
    // Function to update the bot's status
    const updatePresence = () => {
      // Get the correct ActivityType value directly from the enum
      // ActivityType.Streaming instead of ActivityType['STREAMING']
      let activityType;
      switch(status.type.toUpperCase()) {
        case 'PLAYING':
          activityType = ActivityType.Playing;
          break;
        case 'STREAMING':
          activityType = ActivityType.Streaming;
          break;
        case 'LISTENING':
          activityType = ActivityType.Listening;
          break;
        case 'WATCHING':
          activityType = ActivityType.Watching;
          break;
        case 'COMPETING':
          activityType = ActivityType.Competing;
          break;
        default:
          activityType = ActivityType.Playing;
      }
      
      // Replace variables in status text
      let state = status.state
        .replace('{serverCount}', client.guilds.cache.size)
        .replace(
          '{userCount}',
          client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
        );

      // Create activity object
      const activity = {
        name: state,
        type: activityType,
      };

      // Add URL for streaming status
      if (status.type.toUpperCase() === 'STREAMING') {
        activity.url = status.url;
      }

      // Set the presence
      client.user.setPresence({
        activities: [activity],
        status: 'online',
      });
    };

    // Set initial status
    updatePresence();
    
    // Update status regularly to refresh the counts
    setInterval(updatePresence, interval);
    
  } catch (error) {
    console.error(`Error with status configuration: ${error.message}`);
  }
}

module.exports = updateStatus;