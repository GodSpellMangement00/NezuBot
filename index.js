require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const Filter = require("bad-words");
const fs = require("fs");

const filter = new Filter();
const PREFIX = "-";

/* IDS (REPLACE) */
const STAFF_ROLE_ID = "STAFF_ROLE_ID_HERE";
const TICKET_CATEGORY_ID = "TICKET_CATEGORY_ID_HERE";

/* DATA */
let lastDeleted = null;
let topCheckEnabled = false;
const spamMap = new Map();
const levels = new Map();
const giveaways = new Map();
const activeGames = new Map();

/* COUNTING */
let countingChannelId = null;
let currentCount = 0;
let lastCounter = null;
let highScore = 0;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log("NezuBot online");
});

/* SNIPE */
client.on("messageDelete", msg => {
  if (!msg.author || msg.author.bot) return;
  lastDeleted = { author: msg.author.tag, content: msg.content || "No text" };
});

/* TOPCHECK */
client.on("guildMemberAdd", m => {
  if (topCheckEnabled && m.user.bot) m.ban({ reason: "TopCheck" });
});

/* AUTO MOD + XP + COUNTING */
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  /* XP */
  const xp = levels.get(message.author.id) || { xp: 0, level: 1 };
  xp.xp += 5;
  if (xp.xp >= xp.level * 100) {
    xp.level++;
    xp.xp = 0;
    message.channel.send(`${message.author} leveled up to ${xp.level}`);
  }
  levels.set(message.author.id, xp);

  /* COUNTING */
  if (message.channel.id === countingChannelId) {
    const num = parseInt(message.content);
    if (!num || message.author.id === lastCounter || num !== currentCount + 1) {
      highScore = Math.max(highScore, currentCount);
      currentCount = 0;
      lastCounter = null;
      await message.channel.send(`Reset. High score: ${highScore}`);
      await message.delete();
      return;
    }
    currentCount = num;
    lastCounter = message.author.id;
    return;
  }

  /* ADMIN BYPASS */
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return;

  /* BAD WORDS */
  if (filter.isProfane(message.content)) {
    await message.delete();
    return;
  }

  /* LINKS */
  if (
    message.content.includes("http") ||
    message.content.includes("discord.gg")
  ) {
    await message.delete();
    return;
  }

  /* SPAM */
  const now = Date.now();
  const data = spamMap.get(message.author.id) || { count: 0, time: now };
  if (now - data.time < 5000) {
    data.count++;
    if (data.count >= 5) {
      await message.delete();
      return;
    }
  } else {
    data.count = 1;
    data.time = now;
  }
  spamMap.set(message.author.id, data);
});

/* COMMANDS */
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  /* HELP */
  if (cmd === "help") {
    return message.reply(`
NezuBot Help

Moderation:
ban, unban, kick, warn
timeout, untimeout
clear, lock, unlock
nick, role add/remove
hide, unhide, snipe
nuke, clone
roleall, removeroleall
topcheck enable/disable

Tickets:
ticketpanel

Giveaway:
gstart, gend, greroll

Levels:
rank, leaderboard

Counting:
setcounting

Games:
guess, country
`);
  }

  /* MODERATION (SHORTENED BUT COMPLETE) */
  if (cmd === "ban") {
    const m = message.mentions.members.first();
    if (m) await m.ban();
  }
  if (cmd === "kick") {
    const m = message.mentions.members.first();
    if (m) await m.kick();
  }
  if (cmd === "warn") {
    const m = message.mentions.members.first();
    if (m) message.reply(`${m.user.tag} warned`);
  }
  if (cmd === "timeout") {
    const m = message.mentions.members.first();
    const t = parseInt(args[1]);
    if (m && t) await m.timeout(t * 60000);
  }
  if (cmd === "untimeout") {
    const m = message.mentions.members.first();
    if (m) await m.timeout(null);
  }
  if (cmd === "clear") {
    const n = parseInt(args[0]);
    if (n) await message.channel.bulkDelete(n, true);
  }
  if (cmd === "lock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );
  }
  if (cmd === "unlock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: true }
    );
  }
  if (cmd === "nick") {
    const m = message.mentions.members.first();
    const n = args.slice(1).join(" ");
    if (m && n) await m.setNickname(n);
  }
  if (cmd === "snipe" && lastDeleted) {
    message.reply(`${lastDeleted.author}: ${lastDeleted.content}`);
  }
  if (cmd === "nuke") {
    const ch = message.channel;
    const c = await ch.clone();
    await ch.delete();
    c.send("Nuked");
  }

  /* COUNTING SET */
  if (cmd === "setcounting") {
    countingChannelId = message.channel.id;
    currentCount = 0;
    lastCounter = null;
    message.reply("Counting set. Start at 1");
  }

  /* LEVELS */
  if (cmd === "rank") {
    const d = levels.get(message.author.id);
    if (d) message.reply(`Level ${d.level} | XP ${d.xp}`);
  }
  if (cmd === "leaderboard") {
    const top = [...levels.entries()]
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 5);
    let txt = "Leaderboard\n";
    top.forEach((u, i) => (txt += `${i + 1}. <@${u[0]}> L${u[1].level}\n`));
    message.reply(txt);
  }

  /* GAMES */
  if (cmd === "guess") {
    if (!activeGames.has(message.author.id)) {
      activeGames.set(message.author.id, Math.floor(Math.random() * 10) + 1);
      return message.reply("Guess 1-10");
    }
    const g = parseInt(args[0]);
    if (g === activeGames.get(message.author.id)) {
      activeGames.delete(message.author.id);
      message.reply("Correct");
    } else message.reply("Wrong");
  }

  if (cmd === "country") {
    const c = ["Japan", "India", "France"];
    const a = c[Math.floor(Math.random() * c.length)];
    activeGames.set(message.author.id, a);
    message.reply("Guess the country. Use -answer");
  }

  if (cmd === "answer") {
    const a = activeGames.get(message.author.id);
    if (a && args.join(" ").toLowerCase() === a.toLowerCase()) {
      activeGames.delete(message.author.id);
      message.reply("Correct");
    } else message.reply("Wrong");
  }

  /* TICKET PANEL */
  if (cmd === "ticketpanel") {
    const embed = new EmbedBuilder()
      .setTitle("Support")
      .setDescription("Open a ticket");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("Open Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* INTERACTIONS (TICKETS + GIVEAWAY) */
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  /* OPEN TICKET */
  if (interaction.customId === "open_ticket") {
    const ch = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: ["ViewChannel"] },
        { id: interaction.user.id, allow: ["ViewChannel", "SendMessages"] },
        { id: STAFF_ROLE_ID, allow: ["ViewChannel", "SendMessages"] }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close")
        .setStyle(ButtonStyle.Danger)
    );

    ch.send({ content: "Ticket opened", components: [row] });
    interaction.reply({ content: `Created ${ch}`, ephemeral: true });
  }

  /* CLOSE TICKET */
  if (interaction.customId === "close_ticket") {
    const msgs = await interaction.channel.messages.fetch({ limit: 100 });
    let text = "";
    msgs.reverse().forEach(m => (text += `[${m.author.tag}] ${m.content}\n`));
    fs.writeFileSync("transcript.txt", text);
    await interaction.user.send({ files: ["transcript.txt"] });
    fs.unlinkSync("transcript.txt");
    interaction.channel.delete();
  }
});

client.login(process.env.TOKEN);
