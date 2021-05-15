'use strict';

const Discord = require('discord.js');
const db = require('./db');


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

  async parse(user, message) {
    const [verb, ...words] = message.toLowerCase().split(' ');

    const dirs = ['n', 's', 'e', 'w', 'north', 'south', 'east', 'west'];

    if (verb === 'look') {
      await this.look(user);
    }
    else if ((verb === 'go' && dirs.includes(words[0])) || dirs.includes(verb)) {
      const dir = (verb === 'go' ? words[0] : verb).charAt(0);

      const { currentRoom } = user;
      if (dir === 'n') {
        currentRoom[1] -= 1;
      }
      else if (dir === 's') {
        currentRoom[1] += 1;
      }
      else if (dir === 'e') {
        currentRoom[0] += 1;
      }
      else if (dir === 'w') {
        currentRoom[0] -= 1;
      }

      const updatedUser = await db.updateUser({ id: user.id, currentRoom });
      await this.look(updatedUser);
    }
  }
};
