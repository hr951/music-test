const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const yts = require('yt-search');

const color = "#ffffff";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("曲を再生します")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("URL または 検索ワード / 曲名の後ろに作者を入れると精度が上がります")
        .setRequired(true)
    ),

  async execute(interaction) {

    const kazagumo = interaction.client.kazagumo;
    const query = interaction.options.getString('query');

    await interaction.deferReply();

    const ytResult = await yts(query).catch(() => null);
    if (!ytResult || !ytResult.videos.length) {
      return interaction.editReply("YouTubeで曲の情報が見つかりませんでした");
    }
    const video = ytResult.videos[0]; // 一番上の候補

    if (!video) return interaction.editReply("曲が見つかりませんでした");

    const searchTitle = `${video.title} ${video.author.name}`;
    var res = await kazagumo.search(searchTitle, { engine: "soundcloud" });

    if (!res.tracks.length) {
      var res = await kazagumo.search(query, { engine: "soundcloud" });
      if (!res.tracks.length) {
        return interaction.editReply("SoundCloudで音源が見つかりませんでした");
      }
    }

    const track = res.tracks[0];

    track.title = video.title;
    track.author = video.author.name;
    track.thumbnail = video.thumbnail;

    const player = await kazagumo.createPlayer({
      guildId: interaction.guild.id,
      textId: interaction.channel.id,
      voiceId: interaction.member.voice.channel.id,
      deaf: true
    });

    player.data.set("textChannel", interaction.channel);
    player.queue.add(track);
    if (!player.playing && !player.paused) player.play();

    const embed = new EmbedBuilder()
      .setTitle("曲をキューに追加しました")
      .setDescription(`[**${track.title}**](${track.uri})`)
      .addFields(
        { name: "アーティスト: ", value: track.author, inline: true },
        { name: "長さ: ", value: `${Math.floor(track.length / 60000)}:${Math.floor((track.length % 60000) / 1000).toString().padStart(2, '0')}`, inline: true }
      )
      .setImage(track.thumbnail)
      .setColor(color);

    return interaction.editReply({ embeds: [embed] });
  },
};
