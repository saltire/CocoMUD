'use strict';

const Discord = require('discord.js');

const db = require('./db');
const scene = require('./scene');


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
    await scene.drawScene(user.currentRoom);

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
      const nextRoom = [...currentRoom];
      if (dir === 'n') {
        nextRoom[1] -= 1;
      }
      else if (dir === 's') {
        nextRoom[1] += 1;
      }
      else if (dir === 'e') {
        nextRoom[0] += 1;
      }
      else if (dir === 'w') {
        nextRoom[0] -= 1;
      }

      const [updatedUser] = await Promise.all([
        db.updateUser({ id: user.id, currentRoom: nextRoom }),
        db.addMove(user.id, currentRoom, nextRoom),
      ]);
      await this.look(updatedUser);
    }
  }
};
