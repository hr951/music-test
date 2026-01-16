const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const color = "#ffffff";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("現在再生中の曲を表示します"),

    async execute(interaction) {

        const kazagumo = interaction.client.kazagumo;
        const player = kazagumo.players.get(interaction.guild.id);

        if (!interaction.guild) return;

        if (!kazagumo.shoukaku.nodes.size) {
            return interaction.reply({ content: "再生サーバーに接続できていません。\n少し待ってからやり直してください。", ephemeral: true });
        }

        if (!player) return interaction.reply({ content: "再生中の曲がありません", ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle(player.queue.current.title)
            .setURL(player.queue.current.uri)
            .addFields(
                { name: "アーティスト: ", value: player.queue.current.author, inline: true },
                { name: "長さ: ", value: `${Math.floor(player.queue.current.length / 60000)}:${Math.floor((player.queue.current.length % 60000) / 1000).toString().padStart(2, '0')}`, inline: true }
            )
            .setImage(player.queue.current.thumbnail)
            .setColor(color);

        return interaction.reply({ content: "再生中", embeds: [embed] });
    },
};
