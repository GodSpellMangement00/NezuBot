require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes
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
  {
    name: "ping",
    description: "Check bot latency"
  }
];

client.once("ready", async () => {
  console.log("Bot online");

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log("Slash commands loaded");
});

/* SLASH COMMAND HANDLER */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    interaction.reply("Pong 🏓");
  }
});

/* PREFIX COMMAND HANDLER */
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    message.reply("Pong 🏓");
  }
});

client.login(process.env.TOKEN);
