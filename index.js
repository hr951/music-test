// ===== 強制 VoIP 初期化 =====
process.env.DISCORD_VOIP_SODIUM = 'native';
process.env.UV_USE_IO_URING = '0';

// ★ これが決定打 ★
require('sodium-native');

const { Client, GatewayIntentBits } = require('discord.js');
const { Player, QueueRepeatMode } = require('discord-player');
const { SoundCloudExtractor } = require('@discord-player/extractor');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const token = process.env.DISCORD_BOT_TOKEN;
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

const player = new Player(client);

player.events.on('error', (queue, error) => {
  console.error('Player error:', error.message);
});

player.events.on('playerError', (queue, error) => {
  console.error('Player error:', error.message);
});


(async () => {
  await player.extractors.register(SoundCloudExtractor, {
    clientId: SOUNDCLOUD_CLIENT_ID
  });
})();


const { joinVoiceChannel } = require('@discordjs/voice');

console.log('Voice deps loaded');


/* =========================
   Ready
========================= */
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

/* =========================
   Message Commands
========================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const args = message.content.split(" ");
  const cmd = args.shift()?.toLowerCase();

  /* ---------- play ---------- */
  if (cmd === "!play") {
    try {
      const query = args.join(" ");
      if (!query) return message.reply("SoundCloudのURLか検索ワードを入れてください");

      const vc = message.member.voice.channel;
      if (!vc) return message.reply("VCに入ってください");

      const res = await player.search(query, {
        requestedBy: message.author,
        searchEngine: "soundcloud",
      });

      if (!res || !res.tracks.length) {
        return message.reply("再生できる曲が見つかりませんでした");
      }

      const queue = await player.nodes.create(message.guild, {
        metadata: message.channel,
        selfDeaf: true,
      });

      if (!queue.connection) await queue.connect(vc);

      await queue.addTrack(res.tracks[0]);

      if (!queue.isPlaying()) {
        await queue.node.play();
      }

      message.reply(`🎶 追加: **${res.tracks[0].title}**`);
    } catch (err) {
      console.error(err);
      message.reply("❌ この曲はSoundCloud側の制限で再生できません");
    }
  }


  /* ---------- nowplaying ---------- */
  if (cmd === "!nowplaying") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.currentTrack) {
      return message.reply("再生中の曲はありません");
    }

    const t = queue.currentTrack;
    message.reply(
      `🎶 **Now Playing**\n` +
      `**${t.title}**\n` +
      `⏱ ${t.duration} / 👤 ${t.author}`
    );
  }

  /* ---------- queue ---------- */
  if (cmd === "!queue") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return message.reply("キューは空です");
    }

    const list = queue.tracks
      .toArray()
      .slice(0, 10)
      .map((t, i) => `**${i + 1}.** ${t.title} (${t.duration})`)
      .join("\n");

    message.reply(
      `📜 **Queue**\n${list}` +
      (queue.tracks.size > 10
        ? `\n…and ${queue.tracks.size - 10} more`
        : "")
    );
  }

  /* ---------- skip ---------- */
  if (cmd === "!skip") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying()) {
      return message.reply("スキップできません");
    }

    queue.node.skip();
    message.reply("⏭ スキップしました");
  }

  /* ---------- loop ---------- */
  if (cmd === "!loop") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue) return message.reply("再生中の曲はありません");

    const mode = args[0];
    let repeat;

    switch (mode) {
      case "track":
        repeat = QueueRepeatMode.TRACK;
        break;
      case "queue":
        repeat = QueueRepeatMode.QUEUE;
        break;
      default:
        repeat = QueueRepeatMode.OFF;
    }

    queue.setRepeatMode(repeat);

    const text = {
      [QueueRepeatMode.OFF]: "🔁 ループOFF",
      [QueueRepeatMode.TRACK]: "🔂 曲ループON",
      [QueueRepeatMode.QUEUE]: "🔁 キューループON",
    };

    message.reply(text[repeat]);
  }
});

/* =========================
   Error ハンドリング（必須）
========================= */
player.events.on("error", (_, error) => {
  console.error("Player error:", error.message);
});

player.events.on("playerError", (_, error) => {
  console.error("Playback error:", error.message);
});


/* =========================
   Login
========================= */
client.login(token);
