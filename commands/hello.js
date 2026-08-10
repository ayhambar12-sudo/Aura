const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const TARGET_CHANNEL_ID = '1508130733619810505';

// Ensures the funny message is only ever sent once, no matter how many
// times the command is invoked (across the bot's runtime).
let hasBeenSent = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('يرسل رسالة مضحكة مرة واحدة فقط 😂'),

  async execute(interaction) {
    if (hasBeenSent) {
      return interaction.reply({
        content: '😅 عذراً، تم إرسال هذه الرسالة مسبقاً ولن تتكرر!',
        ephemeral: true,
      });
    }

    const channel = await interaction.client.channels
      .fetch(TARGET_CHANNEL_ID)
      .catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: '❌ لم أتمكن من العثور على القناة المطلوبة.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('🤡 عاجل جداً!!! 🚨')
      .setDescription('الو الو الو الو جبس ابو جنه كلش حلو 😂🤣📞')
      .setFooter({ text: '📢 هذه رسالة نادرة... لن تتكرر أبداً 😉' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    hasBeenSent = true;

    return interaction.reply({
      content: '✅ تم إرسال الرسالة المضحكة بنجاح! 😂',
      ephemeral: true,
    });
  },
};
