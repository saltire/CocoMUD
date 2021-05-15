'use strict';

const Discord = require('discord.js');

const font = require('./font');


const client = new Discord.Client();

let chars;

client.on('ready', async () => {
  chars = await font.getFont();
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
  console.log('Got message:', msg);
  if (msg.channel.type === 'dm' && msg.author.tag !== client.user.tag) {

    const imgBuffer = await font.renderLine(chars, msg.content);
    // msg.reply(new Discord.MessageAttachment(imgBuffer));

    // if (msg.member && msg.content.startsWith('!nick'))

    msg.reply({
      content: 'Content',
      files: [new Discord.MessageAttachment(imgBuffer, 'font.png')],
      embed: {
        description: 'Here is your text in C64 format.',
        image: {
          url: 'attachment://font.png',
        },
      },
    })
  }

  if (msg.author.tag === client.user.tag) {
    msg.react('😊');
    msg.react('😍');
    msg.react('✨');
  }
});

client.login(process.env.DISCORD_TOKEN);
