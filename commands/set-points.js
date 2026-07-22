const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { isOwner, sendLog } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تعيين')
    .setDescription('تعيين نقاط محددة لعضو مباشرةً (للمالك فقط)')
    .addUserOption(o => o.setName('العضو').setDescription('العضو').setRequired(true))
    .addIntegerOption(o => o.setName('النقاط').setDescription('القيمة الجديدة').setRequired(true).setMinValue(0))
    .addStringOption(o => o.setName('السبب').setDescription('سبب التعيين').setRequired(true)),

  async execute(interaction) {
    const settings = await db.getGuildSettings(interaction.guildId);
    if (!isOwner(interaction.member, settings)) {
      return interaction.reply({ content: '❌ هذا الأمر للمالك فقط.', ephemeral: true });
    }

    await interaction.deferReply();
    const targetUser = interaction.options.getUser('العضو');
    const newTotal   = interaction.options.getInteger('النقاط');
    const reason     = interaction.options.getString('السبب');
    const prev       = await db.getPoints(targetUser.id, interaction.guildId);

    await db.setPoints(targetUser.id, interaction.guildId, newTotal, reason, interaction.user.id);
    const diff = newTotal - prev;

    const embed = new EmbedBuilder()
      .setColor(0xFFA000)
      .setTitle('✏️ تم تعيين النقاط')
      .addFields(
        { name: '👤 العضو',       value: `<@${targetUser.id}>`,        inline: true  },
        { name: '📊 من',          value: `\`${prev}\``,                 inline: true  },
        { name: '📊 إلى',         value: `\`${newTotal}\``,             inline: true  },
        { name: '↕️ الفرق',      value: `\`${diff >= 0 ? '+' : ''}${diff}\``, inline: true },
        { name: '📝 السبب',       value: reason,                        inline: false },
        { name: '👮 بواسطة',      value: `<@${interaction.user.id}>`,   inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await sendLog(interaction.guild, settings, {
      type: 'set', targetUser, points: Math.abs(diff), reason, newTotal,
      executorTag: interaction.user.tag, executorId: interaction.user.id,
    });
  },
};
