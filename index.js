'use strict';

const Discord = require('discord.js');

const Mud = require('./mud');


const client = new Discord.Client();
const mud = new Mud(client);

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async message => {
  // console.log('Got message:', msg);

  if ((message.channel.type === 'dm' || message.channel.name === 'testing') &&
    message.author.tag !== client.user.tag) {
    await mud.parse(message);
  }
});

client.login(process.env.DISCORD_TOKEN);
