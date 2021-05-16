'use strict';

const Discord = require('discord.js');
const { v4: uuidv4 } = require('uuid');

const characters = require('./characters');
const db = require('./db');
const scene = require('./scene');
const sprites = require('./sprites');


const dirs = ['n', 's', 'e', 'w', 'north', 'south', 'east', 'west'];
const maxCoconuts = 10;

module.exports = class Mud {
  constructor(client) {
    this.client = client;
    this.userManager = new Discord.UserManager(client);
  }

  async send(user, content, options) {
    const discordUser = await this.userManager.fetch(user.id);
    await discordUser.send(content, options);
  }

  async sendBox(user, description) {
    await this.send(user, { embed: { description } });
  }

  async parse(message) {
    let user = await db.getUser(message.author.id);
    if (!user) {
      user = await db.updateUser({ ...message.author });
      await this.intro(user);
      return this.chooseCharacter(user);
    }

    const [verb, ...words] = message.content.toLowerCase().split(' ');

    if (verb === 'help') {
      return this.help(user);
    }

    if (!user.character) {
      return this.parseCharacter(user, message.content);
    }
    if (!user.character.name && !user.character.namePending) {
      return this.parseCharacterName(user, message.content);
    }
    if (user.character.namePending) {
      return this.confirmCharacterName(user, message);
    }

    // Debug commands

    if (verb === 'intro') {
      return this.intro(user);
    }
    if (verb === 'coords') {
      return this.sendBox(user, `You are in room ${user.character.currentRoom}.`);
    }
    if (verb === 'warp') {
      return this.warp(user, words[0]);
    }
    if (verb === 'restart') {
      return this.restart(user);
    }

    // Main commands

    if (verb === 'look') {
      return this.look(user);
    }
    if (verb === 'say' && words.length) {
      return this.say(user, message.content.split(' ').slice(1).join(' '));
    }
    if ((verb === 'go' && dirs.includes(words[0])) || dirs.includes(verb)) {
      return this.move(user, (verb === 'go' ? words[0] : verb).charAt(0));
    }
    if (['take', 'get', 'grab', 'carry', 'steal'].includes(verb) || (verb === 'pick' && words[0] === 'up')) {
      return this.take(user, words[verb === 'pick' ? 1 : 0]);
    }
    if (verb === 'score') {
      return this.score(user);
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
            name: 'Most Rooms Visited',
            value: (topRoomsVisited || []).map(u => `${u.name} - ${u.moves}`).join('\n'),
            inline: true,
          },
        ].filter(f => f.value),
        image: { url: 'attachment://title.png' },
        footer: { text: 'Marcus Kamps (Programming), Laurel Kamps (Graphics)' },
      },
    });
  }

  async help(user) {
    await this.send(user, {
      embed: {
        description: 'This is a text adventure! Type commands to interact with the game.',
        fields: [
          {
            name: 'List of commands',
            value: [
              '**look** - Take a look at your surroundings.',
              '**go north** / **north** / **n** - Move north (or south, east, or west).',
              '**take** / **get** / **pick up *[object]*** - Pick up an object and take it with you.',
              '**say *[something]*** - Say something out loud.',
              '**score** - Show your current score.',
              '**help** - Show this message.',
            ].join('\n'),
          },
        ],
      },
    });
  }

  async move(user, dir) {
    const { currentRoom } = user.character;
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

    if (currentRoom[0] === 0 &&
      ((currentRoom[1] === 0 && dir === 'n') || (currentRoom[1] === -1 && dir === 's'))) {
      return this.sendBox(user, 'The smoking wreckage of your ship blocks all movement in that direction. You\'ll have to go around.');
    }

    if (nextRoom[0] < -180 || nextRoom[0] > 180 || nextRoom[1] < -90 || nextRoom[1] > 90) {
      return this.sendBox(user, 'You can\'t go that way!');
    }

    const [character] = await Promise.all([
      db.updateCharacter({ id: user.character.id, currentRoom: nextRoom }),
      db.addMove(user.character.id, currentRoom, nextRoom),
    ]);
    const updatedUser = { ...user, character };
    return this.look(updatedUser);
  }

  async warp(user, word) {
    const nextRoom = word.split(',').map(w => parseInt(w));

    if (Number.isNaN(nextRoom[0]) || Number.isNaN(nextRoom[1]) ||
      nextRoom[0] < -180 || nextRoom[0] > 180 || nextRoom[1] < -90 || nextRoom[1] > 90) {
      return this.sendBox(user, 'You can\'t go there!');
    }

    const character = await db.updateCharacter({ id: user.character.id, currentRoom: nextRoom });
    const updatedUser = { ...user, character };
    return this.look(updatedUser);
  }

  async restart(user) {
    const updatedUser = await db.updateUser({ id: user.id, characterId: null });
    await this.intro(updatedUser);
    return this.chooseCharacter(updatedUser);
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
      const character = await db.updateCharacter({ id: uuidv4(), userId: user.id, type: num - 1 });
      await db.updateUser({ id: user.id, characterId: character.id });

      await this.send(user, 'What is your character\'s name?');
    }
    else {
      await this.send(user, `Try entering a number from 1 to ${spriteTree.characters.length}.`);
    }
  }

  async parseCharacterName(user, content) {
    await db.updateCharacter({ id: user.characterId, name: content, namePending: true });
    await this.send(user,
      `Name your character **${content}**? Type \`yes\` to confirm, or enter a different name.`);
  }

  async confirmCharacterName(user, message) {
    if (['y', 'yes'].includes(message.content.toLowerCase())) {
      const character = await db.updateCharacter({
        id: user.characterId,
        namePending: false,
        currentRoom: [0, 0],
      });
      const updatedUser = { ...user, character };
      await message.react('👍');
      await this.send(updatedUser, 'OK, here we go!');
      await this.look(updatedUser);
    }
    else {
      await this.parseCharacterName(user, message.content);
    }
  }

  async look(user) {
    const coords = user.character.currentRoom;
    const room = (await db.getRoom(coords)) || await scene.createRoom(coords);

    const sceneImg = new Discord.MessageAttachment(
      await scene.drawScene(user, room), 'scene.png');

    await this.send(user, {
      files: [sceneImg],
      embed: {
        description: scene.getDescription(user, room),
        image: { url: 'attachment://scene.png' },
      },
    });
  }

  async say(user, text) {
    const { users } = await db.getRoom(user.character.currentRoom);

    await Promise.all(users
      .map(u => this.sendBox(u, `**${user.character.name}** says: *${text}*`)));
  }

  async take(user, noun) {
    const { coords, objects } = await db.getRoom(user.character.currentRoom);

    const matchingObjs = objects.filter(obj => obj.nouns?.includes(noun));
    if (!matchingObjs.length) {
      return this.sendBox(user, 'There\'s nothing like that here for you to take.');
    }
    if (!matchingObjs.some(obj => obj.canTake)) {
      return this.sendBox(user, 'You can\'t take that.');
    }
    if (user.character.coconuts >= maxCoconuts) {
      return this.sendBox(user, 'You can\'t carry any more coconuts!');
    }

    const currentCount = user.character.coconuts || 0;
    let newCount = 0;
    matchingObjs.forEach(obj => {
      const num = obj.count || 1;
      const maxNum = Math.min(num, maxCoconuts - (currentCount + newCount));
      newCount += maxNum;
      if (maxNum === num) {
        Object.assign(obj, { gone: true });
      }
      else {
        Object.assign(obj, { count: num - maxNum });
      }
    });

    const [character] = await Promise.all([
      db.updateCharacter({ id: user.character.id, coconuts: currentCount + newCount }),
      db.updateRoom({ coords, objects: objects.filter(obj => !obj.gone) }),
    ]);

    return this.sendBox(user, [
      `OK, you picked up ${newCount} coconut${newCount === 1 ? '' : 's'}! You now have ${character.coconuts} coconut${character.coconuts === 1 ? '' : 's'}.`,
      character.coconuts >= maxCoconuts &&
        'You don\'t think you can carry any more! Better find some place to unload them.',
    ].filter(Boolean).join('\n'));
  }

  async score(user) {
    return this.sendBox(user, `You are carrying ${user.character.coconuts} coconut${user.character.coconuts === 1 ? '' : 's'}.`);
  }
};
