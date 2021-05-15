'use strict';

const Discord = require('discord.js');

const db = require('./db');
const Mud = require('./mud');


const client = new Discord.Client();
const mud = new Mud(client);

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
  // console.log('Got message:', msg);

  if ((msg.channel.type === 'dm' || msg.channel.name === 'testing') &&
    msg.author.tag !== client.user.tag) {
    let user = await db.getUser(msg.author.id);

    if (!user) {
      user = await db.updateUser({ ...msg.author, currentRoom: [0, 0] });
      await mud.intro(user);
    }
    else {
      await mud.parse(user, msg.content);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
