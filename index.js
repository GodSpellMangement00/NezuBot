require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const PREFIX = "-";
let lastDeleted = null;
let topCheckEnabled = false;

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

/* COMMAND HANDLER */
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("No permission");
    const id = args[0];
    if (!id) return message.reply("Give user ID");
    await message.guild.members.unban(id);
    message.reply("User unbanned");
  }

  if (cmd === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("No permission");
    const m = message.mentions.members.first();
    if (!m) return message.reply("Mention user");
    await m.kick();
    message.reply("User kicked");
  }

  if (cmd === "warn") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("No permission");
    const m = message.mentions.members.first();
    if (!m) return message.reply("Mention user");
    message.reply(`${m.user.tag} warned`);
  }

  if (cmd === "clearwarns") {
    message.reply("Warnings cleared (DB later)");
  }

  if (cmd === "timeout") {
    const m = message.mentions.members.first();
    const time = parseInt(args[1]);
    if (!m || !time) return message.reply("Mention user + minutes");
    await m.timeout(time * 60 * 1000);
    message.reply("User timed out");
  }

  if (cmd === "untimeout") {
    const m = message.mentions.members.first();
    if (!m) return message.reply("Mention user");
    await m.timeout(null);
    message.reply("Timeout removed");
  }

  if (cmd === "slowmode") {
    const time = parseInt(args[0]);
    if (!time) return message.reply("Give seconds");
    await message.channel.setRateLimitPerUser(time);
    message.reply("Slowmode set");
  }

  if (cmd === "unslowmode") {
    await message.channel.setRateLimitPerUser(0);
    message.reply("Slowmode off");
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageNicknames))
      return message.reply("No permission");
    const m = message.mentions.members.first();
    const nick = args.slice(1).join(" ");
    if (!m || !nick) return message.reply("Mention + nickname");
    await m.setNickname(nick);
    message.reply("Nickname changed");
  }

  if (cmd === "role") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return message.reply("No permission");

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

  if (cmd === "rolecreate") {
    const name = args.join(" ");
    if (!name) return message.reply("Give role name");
    await message.guild.roles.create({ name });
    message.reply("Role created");
  }

  if (cmd === "roledelete") {
    const role = message.mentions.roles.first();
    if (!role) return message.reply("Mention role");
    await role.delete();
    message.reply("Role deleted");
  }

  if (cmd === "hide") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { ViewChannel: false }
    );
    message.reply("Channel hidden");
  }

  if (cmd === "unhide") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { ViewChannel: true }
    );
    message.reply("Channel unhidden");
  }

  if (cmd === "snipe") {
    if (!lastDeleted) return message.reply("Nothing to snipe");
    message.reply(`**${lastDeleted.author}**: ${lastDeleted.content}`);
  }

  /* ===== PHASE 3 ===== */

  if (cmd === "nuke") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("No permission");
    const ch = message.channel;
    const newCh = await ch.clone();
    await ch.delete();
    newCh.send("Channel nuked");
  }

  if (cmd === "clone") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return message.reply("No permission");
    await message.channel.clone();
    message.reply("Channel cloned");
  }

  if (cmd === "roleall") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return message.reply("No permission");
    const role = message.mentions.roles.first();
    if (!role) return message.reply("Mention role");
    const members = await message.guild.members.fetch();
    members.forEach(m => {
      if (!m.user.bot) m.roles.add(role);
    });
    message.reply("Role added to all");
  }

  if (cmd === "removeroleall") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return message.reply("No permission");
    const role = message.mentions.roles.first();
    if (!role) return message.reply("Mention role");
    const members = await message.guild.members.fetch();
    members.forEach(m => {
      if (m.roles.cache.has(role.id)) m.roles.remove(role);
    });
    message.reply("Role removed from all");
  }

  if (cmd === "topcheck") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("No permission");

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
