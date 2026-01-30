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

/* SLASH COMMANDS */
const commands = [
  { name: "help", description: "Show help menu" }
];

/* READY */
client.once("ready", async () => {
  console.log("Bot online");

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
});

/* BOT INFO EMBED */
function botInfoEmbed() {
  return new EmbedBuilder()
    .setTitle("NezuBot")
    .setDescription("Cute Demon Slayer bot 🩷")
    .addFields(
      { name: "Owner", value: "DeadSlot", inline: true },
      { name: "Prefix", value: "-", inline: true },
      { name: "Version", value: "1.0", inline: true }
    );
}

/* COMMAND MENU EMBED */
function commandMenuEmbed() {
  return new EmbedBuilder()
    .setTitle("Command Menu")
    .setDescription("Use buttons to view commands")
    .addFields(
      { name: "Moderation", value: "ban, kick, mute, warn..." },
      { name: "Games", value: "connect4, battleship..." },
      { name: "Utility", value: "help, poll, suggest..." }
    );
}

/* BUTTONS */
const buttons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("commands")
    .setLabel("Commands")
    .setStyle(ButtonStyle.Primary)
);

/* BOT MENTION = INFO ONLY */
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === `<@${client.user.id}>`) {
    return message.reply({
      embeds: [botInfoEmbed()],
      components: [buttons]
    });
  }

  if (!message.content.startsWith(PREFIX)) return;

  const cmd = message.content.slice(PREFIX.length).toLowerCase();

  if (cmd === "help") {
    message.reply({
      embeds: [commandMenuEmbed()],
      components: [buttons]
    });
  }
});

/* SLASH /help */
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "help") {
      interaction.reply({
        embeds: [commandMenuEmbed()],
        components: [buttons]
      });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "commands") {
      interaction.reply({
        embeds: [commandMenuEmbed()],
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
