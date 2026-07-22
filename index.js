const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs                   = require('fs');
const path                 = require('path');
const db                   = require('./database');
const { handleMessage }    = require('./prefix-handler');
const { startAutoReport }  = require('./auto-report');

// ─── Validate env ─────────────────────────────────────────────────────────────
const token = process.env.BOT_TOKEN;
if (!token) { console.error('❌ BOT_TOKEN غير موجود'); process.exit(1); }

// ─── Build client ─────────────────────────────────────────────────────────────
function buildClient(withMessageContent) {
  const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];
  if (withMessageContent) intents.push(GatewayIntentBits.MessageContent);
  return new Client({ intents });
}

// ─── Load commands ────────────────────────────────────────────────────────────
function loadCommands(client) {
  client.commands = new Collection();
  const dir = path.join(__dirname, 'commands');

  // Only load commands if the directory exists
  if (!fs.existsSync(dir)) {
    console.log('⚠️  مجلد commands غير موجود — تم تخطي تحميل slash commands');
    return;
  }

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(dir, file));
    if (cmd.data && cmd.execute) {
      client.commands.set(cmd.data.name, cmd);
      console.log(`✅ تم تحميل الأمر: /${cmd.data.name}`);
    }
  }
}

// ─── Attach events ────────────────────────────────────────────────────────────
function attachEvents(client, prefixEnabled) {
  client.once(Events.ClientReady, async (c) => {
    await db.init();
    console.log(`\n🤖 البوت جاهز! تم تسجيل الدخول كـ ${c.user.tag}`);
    console.log(`📊 الخوادم المتصلة: ${c.guilds.cache.size}`);
    console.log(`⌨️  أوامر الـ !: ${prefixEnabled ? '✅ مفعّلة' : '❌ معطّلة (فعّل MESSAGE CONTENT INTENT)'}`);

    if (!prefixEnabled) {
      console.log('\n══════════════════════════════════════════════');
      console.log('⚠️  لتفعيل أوامر ! اتبع الخطوات:');
      console.log('  1. discord.com/developers/applications');
      console.log(`  2. افتح تطبيقك (ID: ${process.env.CLIENT_ID})`);
      console.log('  3. Bot ← Privileged Gateway Intents');
      console.log('  4. فعّل: MESSAGE CONTENT INTENT ✓');
      console.log('  5. أعد تشغيل البوت');
      console.log('══════════════════════════════════════════════\n');
    }

    startAutoReport(c);
  });

  // Slash commands + button interactions
  client.on(Events.InteractionCreate, async (interaction) => {
    // Button interactions (e.g. reset confirmation)
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('reset_cancel_')) {
        return interaction.update({ content: '❌ تم إلغاء التصفير.', embeds: [], components: [] });
      }
      // reset_confirm_ is handled inside reset.js via awaitMessageComponent — ignore here
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`خطأ في /${interaction.commandName}:`, error);
      const msg = { content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  });

  // Prefix commands
  if (prefixEnabled) {
    client.on(Events.MessageCreate, (msg) => {
      handleMessage(msg, client).catch(console.error);
    });
  }
}

// ─── Start with fallback ──────────────────────────────────────────────────────
async function start(withMessageContent = true) {
  const client = buildClient(withMessageContent);
  loadCommands(client);
  attachEvents(client, withMessageContent);

  try {
    await client.login(token);
  } catch (err) {
    if (withMessageContent && err.message?.includes('disallowed intents')) {
      console.warn('\n⚠️  MessageContent intent غير مفعّل — إعادة المحاولة بدون أوامر !\n');
      client.destroy();
      return start(false);
    }
    console.error('❌ فشل تسجيل الدخول:', err.message);
    process.exit(1);
  }
}

start();
