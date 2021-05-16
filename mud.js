'use strict';

const Discord = require('discord.js');

const characters = require('./characters');
const db = require('./db');
const scene = require('./scene');
const sprites = require('./sprites');


const dirs = ['n', 's', 'e', 'w', 'north', 'south', 'east', 'west'];

module.exports = class Mud {
  constructor(client) {
    this.client = client;
    this.userManager = new Discord.UserManager(client);
  }

  async send(user, content, options) {
    const discordUser = await this.userManager.fetch(user.id);
    await discordUser.send(content, options);
  }

  async parse(message) {
    let user = await db.getUser(message.author.id);
    if (!user) {
      user = await db.updateUser({ ...message.author });
      await this.intro(user);
      return this.chooseCharacter(user);
    }
    if (!user.character) {
      return this.parseCharacter(user, message.content);
    }
    if (!user.character.name && !user.character.namePending) {
      return this.parseCharacterName(user, message.content);
    }
    if (user.character.namePending) {
      return this.confirmCharacterName(user, message.content);
    }

    const [verb, ...words] = message.content.toLowerCase().split(' ');

    if (verb === 'intro') {
      return this.intro(user);
    }
    if (verb === 'look') {
      return this.look(user);
    }
    if (verb === 'say' && words.length) {
      return this.say(user, words.join(' '));
    }

    if ((verb === 'go' && dirs.includes(words[0])) || dirs.includes(verb)) {
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
      return this.look(updatedUser);
    }

    return null;
  }

  async intro(user) {
    const topRoomsVisited = await db.getTopRoomsVisited();

    const titleImg = new Discord.MessageAttachment(
      (await sprites.getSprite('title')).buffer, 'title.png');

    await this.send(user, {
      files: [titleImg],
      embed: {
        title: 'FunMUD',
        description: 'A Discord Adventure',
        fields: [
          {
            name: 'Top Rooms Visited',
            value: (topRoomsVisited || []).map(u => `${u.character.name} - ${u.moves}`).join('\n'),
            inline: true,
          },
        ],
        image: { url: 'attachment://title.png' },
        footer: { text: 'Marcus Kamps (Programming), Laurel Kamps (Graphics)' },
      },
    });
  }

  async chooseCharacter(user) {
    await this.send(user, 'Hello, and welcome to FunMUD!');
    await this.send(user, 'Type a number to choose your character:');
    await this.send(user, {
      files: [new Discord.MessageAttachment(await characters.getCharacterScreen())],
    });
  }

  async parseCharacter(user, content) {
    const num = parseInt(content);
    const { spriteTree } = await sprites.getSprites();
    if (num > 0 && num <= spriteTree.characters.length) {
      await db.updateUser({ id: user.id, 'character.id': num - 1 });

      await this.send(user, 'What is your character\'s name?');
    }
    else {
      await this.send(user, `Try entering a number from 1 to ${spriteTree.characters.length}.`);
    }
  }

  async parseCharacterName(user, content) {
    await db.updateUser({ id: user.id, 'character.namePending': content });
    await this.send(user,
      `Name your character **${content}**? Type \`yes\` to confirm, or enter a different name.`);
  }

  async confirmCharacterName(user, content) {
    if (['y', 'yes'].includes(content.toLowerCase())) {
      await db.updateUser({
        id: user.id,
        currentRoom: [0, 0],
        'character.name': user.character.namePending,
        'character.namePending': null,
      });
      await this.send(user, 'OK, here we go!');
      await this.look(user);
    }
    else {
      await this.parseCharacterName(user, content);
    }
  }

  async look(user) {
    const coords = user.currentRoom;
    const room = (await db.getRoom(coords)) || await scene.createRoom(coords);

    const sceneImg = new Discord.MessageAttachment(
      await scene.drawScene(user, room), 'scene.png');

    // const testImg = new Discord.MessageAttachment('./images/test.png');

    await this.send(user, {
      // content: `You are in room ${user.currentRoom}.`,
      files: [sceneImg],
      embed: {
        description: [
          `You are in room ${user.currentRoom}.`,
          ...(room.users || []).filter(u => u.id !== user.id)
            .map(u => `**${u.character.name}** is here!`),
        ].join('\n'),
        image: { url: 'attachment://scene.png' },
      },
    });
  }

  async say(user, text) {
    const { users } = await db.getRoom(user.currentRoom);

    await Promise.all(users.map(u => this.send(u, {
      embed: {
        description: `**${user.character.name}** says: *${text}*`,
      },
    })));
  }
};
