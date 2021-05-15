'use strict';

const Discord = require('discord.js');

const characters = require('./characters');
const db = require('./db');
const scene = require('./scene');
const sprites = require('./sprites');


module.exports = class Mud {
  constructor(client) {
    this.client = client;
    this.userManager = new Discord.UserManager(client);
  }

  async send(user, content, options) {
    const discordUser = await this.userManager.fetch(user.id);
    await discordUser.send(content, options);
  }

  async intro(user) {
    await this.send(user, 'Hello, and welcome to FunMUD!');

    await this.send('Type a number to choose your character:');
    await this.send(user, {
      files: [new Discord.MessageAttachment(await characters.getCharacterScreen())],
    });
  }

  async look(user) {
    const sceneImg = new Discord.MessageAttachment(
      await scene.drawScene(user), 'scene.png');

    // const testImg = new Discord.MessageAttachment('./images/test.png');

    await this.send(user, {
      // content: `You are in room ${user.currentRoom}.`,
      files: [sceneImg],
      embed: {
        description: `You are in room ${user.currentRoom}.`,
        image: {
          url: 'attachment://scene.png',
        },
      },
    });
  }

  async parseCharacter(user, message) {
    const num = parseInt(message);
    const { spriteTree } = await sprites.getSprites();
    if (num > 0 && num <= spriteTree.characters.length) {
      const updatedUser = await db.updateUser({ id: user.id, character: num - 1 });

      this.send(updatedUser, 'OK, here we go!');
      this.look(updatedUser);
    }
    else {
      this.send(user, `Try entering a number from 1 to ${spriteTree.characters.length}.`);
    }
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
