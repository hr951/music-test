const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const color = "#ffffff";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("再生キューを表示します"),

    async execute(interaction) {

        const kazagumo = interaction.client.kazagumo;
        const player = kazagumo.players.get(interaction.guild.id);

        console.log(player);

        if (!interaction.guild) return;

        if (!kazagumo.shoukaku.nodes.size) {
            return interaction.reply({ content: "再生サーバーに接続できていません。\n少し待ってからやり直してください。", ephemeral: true });
        }

        if (!player) return interaction.reply({ content: "再生中の曲がありません", ephemeral: true });
        const q = player.queue.map((t, i) => `${i + 1}. ${t.title}`).join("\n");

        const embed = new EmbedBuilder()
            .setTitle("再生キュー")
            .setDescription(q || "ありません")
            .setColor(color);
            
        return interaction.reply({ embeds: [embed] });
    },
};
