'use strict';

const Discord = require('discord.js');


module.exports = class Mud {
  constructor(client) {
    this.client = client;
    this.userManager = new Discord.UserManager(client);
  }

  async send(user, content, options) {
    (await this.userManager.fetch(user.id)).send(content, options);
  }

  async intro(user) {
    await this.send(user, 'Hello, and welcome to FunMUD!');
  }

  async look(user) {
    const testImg = new Discord.MessageAttachment('./images/test.png');

    await this.send(user, {
      // content: `You are in room ${user.currentRoom}.`,
      files: [testImg],
      embed: {
        description: `You are in room ${user.currentRoom}.`,
        image: {
          url: 'attachment://test.png',
        },
      },
    });
  }
};
