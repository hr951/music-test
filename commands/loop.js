const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const color = "#ffffff";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("ループモードを設定します")
        .addStringOption(option =>
            option.setName("mode")
                .setDescription("ループモード")
                .setRequired(true)
                .addChoices(
                    { name: "off", value: "none" },
                    { name: "track", value: "track" },
                    { name: "queue", value: "queue" }
                )
        ),

    async execute(interaction) {

        const kazagumo = interaction.client.kazagumo;
        const player = kazagumo.players.get(interaction.guild.id);
        const mode = interaction.options.getString('mode');

        if (!interaction.guild) return;

        if (!kazagumo.shoukaku.nodes.size) {
            return interaction.reply({ content: "再生サーバーに接続できていません。\n少し待ってからやり直してください。", ephemeral: true });
        }

        if (!player) return interaction.reply({ content: "再生中の曲がありません", ephemeral: true });
        player.setLoop(mode);

        const ja = {
            none: "オフ",
            track: "曲",
            queue: "キュー"
        };

        const embed = new EmbedBuilder()
            .setTitle(`ループモードを **${ja[mode]}** に設定しました`)
            .setColor(color);

        return interaction.reply({ embeds: [embed] });
    },
};
