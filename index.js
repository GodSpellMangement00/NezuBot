require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const Filter = require("bad-words");
const filter = new Filter();

const PREFIX = "-";
let lastDeleted = null;
let topCheckEnabled = false;
const spamMap = new Map();

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

/* SAVE SNIPE */
client.on("messageDelete", msg => {
  if (!msg.author || msg.author.bot) return;
  lastDeleted = {
    author: msg.author.tag,
    content: msg.content || "No text"
  };
});

/* TOPCHECK */
client.on("guildMemberAdd", member => {
  if (topCheckEnabled && member.user.bot) {
    member.ban({ reason: "TopCheck enabled" });
  }
});

/* AUTO MOD */
client.on("messageCreate", async message => {
  if (!message.guild) return;
  if (message.author.bot) return;

  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return;

  const content = message.content;

  /* BAD WORDS */
  if (filter.isProfane(content)) {
    await message.delete();
    return message.channel.send(`${message.author}, bad words not allowed`)
      .then(m => setTimeout(() => m.delete(), 3000));
  }

  /* ANTI LINK */
  if (
    content.includes("http://") ||
    content.includes("https://") ||
    content.includes("discord.gg")
  ) {
    await message.delete();
    return message.channel.send(`${message.author}, links not allowed`)
      .then(m => setTimeout(() => m.delete(), 3000));
  }

  /* CAPS */
  const caps = content.replace(/[^A-Z]/g, "").length;
  if (caps > 5 && caps / content.length > 0.7) {
    await message.delete();
    return message.channel.send(`${message.author}, stop caps`)
      .then(m => setTimeout(() => m.delete(), 3000));
  }

  /* SPAM */
  const now = Date.now();
  const data = spamMap.get(message.author.id) || { count: 0, time: now };

  if (now - data.time < 5000) {
    data.count++;
    if (data.count >= 5) {
      await message.delete();
      return message.channel.send(`${message.author}, stop spamming`)
        .then(m => setTimeout(() => m.delete(), 3000));
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

  /* ===== PHASE 1 ===== */

  if (cmd === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("No permission");
    const m = message.mentions.members.first();
    if (!m) return message.reply("Mention user");
    await m.ban();
    message.reply("User banned");
  }

  if (cmd === "unban") {
    const id = args[0];
    if (!id) return message.reply("Give ID");
    await message.guild.members.unban(id);
    message.reply("User unbanned");
  }

  if (cmd === "kick") {
    const m = message.mentions.members.first();
    if (!m) return message.reply("Mention user");
    await m.kick();
    message.reply("User kicked");
  }

  if (cmd === "warn") {
    const m = message.mentions.members.first();
    if (!m) return message.reply("Mention user");
    message.reply(`${m.user.tag} warned`);
  }

  if (cmd === "timeout") {
    const m = message.mentions.members.first();
    const time = parseInt(args[1]);
    if (!m || !time) return message.reply("Mention user + minutes");
    await m.timeout(time * 60000);
    message.reply("Timed out");
  }

  if (cmd === "untimeout") {
    const m = message.mentions.members.first();
    if (!m) return message.reply("Mention user");
    await m.timeout(null);
    message.reply("Timeout removed");
  }

  if (cmd === "clear") {
    const amt = parseInt(args[0]);
    if (!amt) return message.reply("Give number");
    await message.channel.bulkDelete(amt, true);
    message.reply(`Deleted ${amt}`).then(m => setTimeout(() => m.delete(), 2000));
  }

  if (cmd === "lock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );
    message.reply("Channel locked");
  }

  if (cmd === "unlock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: true }
    );
    message.reply("Channel unlocked");
  }

  /* ===== PHASE 2 ===== */

  if (cmd === "nick") {
    const m = message.mentions.members.first();
    const nick = args.slice(1).join(" ");
    if (!m || !nick) return message.reply("Mention + nickname");
    await m.setNickname(nick);
    message.reply("Nickname changed");
  }

  if (cmd === "role") {
    const action = args[0];
    const m = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!m || !role) return message.reply("Mention user + role");

    if (action === "add") {
      await m.roles.add(role);
      message.reply("Role added");
    }
    if (action === "remove") {
      await m.roles.remove(role);
      message.reply("Role removed");
    }
  }

  if (cmd === "hide") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { ViewChannel: false }
    );
    message.reply("Hidden");
  }

  if (cmd === "unhide") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { ViewChannel: true }
    );
    message.reply("Unhidden");
  }

  if (cmd === "snipe") {
    if (!lastDeleted) return message.reply("Nothing to snipe");
    message.reply(`**${lastDeleted.author}**: ${lastDeleted.content}`);
  }

  /* ===== PHASE 3 ===== */

  if (cmd === "nuke") {
    const ch = message.channel;
    const newCh = await ch.clone();
    await ch.delete();
    newCh.send("Channel nuked");
  }

  if (cmd === "clone") {
    await message.channel.clone();
    message.reply("Channel cloned");
  }

  if (cmd === "roleall") {
    const role = message.mentions.roles.first();
    if (!role) return message.reply("Mention role");
    const members = await message.guild.members.fetch();
    members.forEach(m => {
      if (!m.user.bot) m.roles.add(role);
    });
    message.reply("Role added to all");
  }

  if (cmd === "removeroleall") {
    const role = message.mentions.roles.first();
    if (!role) return message.reply("Mention role");
    const members = await message.guild.members.fetch();
    members.forEach(m => {
      if (m.roles.cache.has(role.id)) m.roles.remove(role);
    });
    message.reply("Role removed from all");
  }

  if (cmd === "topcheck") {
    if (args[0] === "enable") {
      topCheckEnabled = true;
      return message.reply("TopCheck enabled");
    }
    if (args[0] === "disable") {
      topCheckEnabled = false;
      return message.reply("TopCheck disabled");
    }
    message.reply("Use -topcheck enable / disable");
  }
});

client.login(process.env.TOKEN);
