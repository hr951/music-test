const { Client, GatewayIntentBits } = require('discord.js');
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
require("dotenv").config();
require("./server.js");

// --- 設定 ---
const TOKEN = process.env.DISCORD_BOT_TOKEN; // ボットのトークン
const PREFIX = "!";
const Nodes = [{
    name: 'Render-Node',
    url: process.env.LAVA_LINK_URL, // RenderのURL (ポート443を指定)
    auth: process.env.LAVA_LINK_AUTH, // application.ymlで設定したパスワード
    secure: true // HTTPS(443)を使う場合は必ずtrue
}];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// Kazagumoの初期化部分を変更
const kazagumo = new Kazagumo({
    defaultSearchEngine: "soundcloud",
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
}, new Connectors.DiscordJS(client), Nodes);

kazagumo.on("playerStart", (player, track) => {
    player.data.get("textChannel").send(`再生中: **${track.title}**`);
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const player = kazagumo.players.get(message.guild.id);

    // !play <検索語句 or URL>
    if (command === "play") {
        const query = args.join(" ");
        if (!message.member.voice.channel) return message.reply("VCに入ってください");
        if (!query) return message.reply("曲名かURLを入力してください");

        let res = await kazagumo.search(query);
        if (!res.tracks.length) return message.reply("見つかりませんでした");

        const newPlayer = await kazagumo.createPlayer({
            guildId: message.guild.id,
            textId: message.channel.id,
            voiceId: message.member.voice.channel.id,
            deaf: true
        });

        newPlayer.data.set("textChannel", message.channel);
        newPlayer.queue.add(res.tracks[0]);
        if (!newPlayer.playing && !newPlayer.paused) newPlayer.play();
        return message.reply(`**${res.tracks[0].title}**をキューに追加しました`);
    }

    // !skip
    if (command === "skip") {
        if (!player) return message.reply("再生中の曲がありません");
        player.skip();
        return message.reply("曲をスキップしました");
    }

    // !loop (track / queue / none)
    if (command === "loop") {
        if (!player) return message.reply("再生中の曲がありません");
        const mode = args[0] || (player.loop === "none" ? "track" : player.loop === "track" ? "queue" : "none");
        player.setLoop(mode);
        return message.reply(`ループモードを **${mode}** に設定しました`);
    }

    // !queue
    if (command === "queue") {
        if (!player) return message.reply("再生中の曲がありません");
        const q = player.queue.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
        return message.reply(`📜 **現在のキュー:**\n${q || "空っぽです"}`);
    }

    // !nowplaying (np)
    if (command === "nowplaying" || command === "np") {
        if (!player) return message.reply("再生中の曲がありません");
        return message.reply(`再生中: **${player.queue.current.title}**`);
    }

    // !stop
    if (command === "stop") {
        if (!player) return message.reply("再生中の曲がありません");

        // プレイヤーを破棄（曲を停止、キューをクリア、ボイスチャンネルから退出を一括で行う）
        player.destroy();

        return message.reply("再生を停止し、キューをクリアして退出しました");
    }

    if (!player) return;
});

// 誰かがボイスチャンネルからいなくなった時の処理
client.on("voiceStateUpdate", (oldState, newState) => {
    const player = kazagumo.players.get(oldState.guild.id);
    if (!player) return;

    // ボットしかチャンネルにいなくなったら
    const voiceChannel = client.channels.cache.get(player.voiceId);
    if (voiceChannel && voiceChannel.members.filter(m => !m.user.bot).size === 0) {
        player.destroy();
        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) textChannel.send("誰もいなくなったので退出しました。");
    }
});

client.login(TOKEN);
