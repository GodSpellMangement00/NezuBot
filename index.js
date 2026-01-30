require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const PREFIX = "-";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* SLASH COMMAND */
const commands = [
  { name: "help", description: "Show help menu" }
];

client.once("ready", async () => {
  console.log("Bot online");

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
});

/* EMBEDS */
const infoEmbed = new EmbedBuilder()
  .setTitle("NezuBot")
  .setDescription("Cute Demon Slayer bot")
  .addFields(
    { name: "Owner", value: "DeadSlot", inline: true },
    { name: "Prefix", value: "-", inline: true },
    { name: "Version", value: "1.0", inline: true }
  );

const mainHelp = new EmbedBuilder()
  .setTitle("Help Menu")
  .setDescription("Click buttons to view commands");

const modEmbed = new EmbedBuilder()
  .setTitle("Moderation Commands")
  .setDescription("ban, kick, mute, warn, purge, lock");

const gameEmbed = new EmbedBuilder()
  .setTitle("Game Commands")
  .setDescription("connect4, battleship, country-guess");

const utilEmbed = new EmbedBuilder()
  .setTitle("Utility Commands")
  .setDescription("help, poll, suggest, autoresponder");

/* BUTTONS */
const menuButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("mod").setLabel("Moderation").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId("games").setLabel("Games").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId("util").setLabel("Utility").setStyle(ButtonStyle.Primary)
);

/* MESSAGE HANDLER */
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === `<@${client.user.id}>`) {
    return message.reply({ embeds: [infoEmbed] });
  }

  if (!message.content.startsWith(PREFIX)) return;

  const cmd = message.content.slice(PREFIX.length).toLowerCase();
  if (cmd === "help") {
    message.reply({ embeds: [mainHelp], components: [menuButtons] });
  }
});

/* INTERACTIONS */
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "help") {
      interaction.reply({ embeds: [mainHelp], components: [menuButtons] });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "mod")
      interaction.reply({ embeds: [modEmbed], ephemeral: true });

    if (interaction.customId === "games")
      interaction.reply({ embeds: [gameEmbed], ephemeral: true });

    if (interaction.customId === "util")
      interaction.reply({ embeds: [utilEmbed], ephemeral: true });
  }
});

client.login(process.env.TOKEN);
