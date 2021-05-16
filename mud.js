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
    if (!user.disabled) {
      const discordUser = await this.userManager.fetch(user.id);
      await discordUser.send(content, options);
    }
  }

  async sendBox(user, description) {
    await this.send(user, { embed: { description } });
  }

  async parse(message) {
    let user = await db.getUser(message.author.id);
    if (!user || user.disabled) {
      user = await db.updateUser({ ...message.author, disabled: false });
      await this.intro(user);
      return this.chooseCharacter(user);
    }

    const [verb, ...words] = message.content.toLowerCase().split(' ');

    // Priority commands

    if (verb === 'help') {
      return this.help(user);
    }
    if (verb === 'restart') {
      return this.restart(user);
    }
    if (verb === 'quit') {
      return this.quit(user);
    }

    // Setup steps

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
    if (['drop', 'put', 'insert'].includes(verb) &&
      ['nuts', 'coconuts', 'nut', 'coconut'].includes(words[0])) {
      return this.drop(user);
    }
    if (verb === 'score') {
      return this.score(user);
    }
    if (verb === 'credits') {
      return this.credits(user);
    }

    return null;
  }

  async intro(user) {
    const [topRoomsVisited, topCoconutsReturned] = await Promise.all([
      db.getTopRoomsVisited(),
      db.getTopCoconutsReturned(),
    ]);

    const titleImg = new Discord.MessageAttachment(
      (await sprites.getSprite('title')).buffer, 'title.png');

    await this.send(user, {
      files: [titleImg],
      embed: {
        title: 'CocoMUD',
        description: 'A Discord Adventure',
        fields: [
          {
            name: 'Most Rooms Visited',
            value: (topRoomsVisited || []).map(c => `${c.name} - ${c.moves}`).join('\n'),
            inline: true,
          },
          {
            name: 'Most Coconuts Returned',
            value: (topCoconutsReturned || []).map(c => `${c.name} - ${c.coconutsReturned}`).join('\n'),
            inline: true,
          },
          {
            name: 'Developer Notes',
            value: [
              'Hello TOJam! Hopefully this game works, but probably it doesn\'t!',
              '',
              'Some other mechanics we had planned but haven\'t yet made it: giant pools of sticky oobleck, swarms of bees, waypoints and portals, clever escapes, grisly deaths, and grim looming statues where other characters have met their untimely end...',
              '',
              'This is a multiplayer game so anyone can join, just DM the CocoMUD bot!',
              '',
              '- Marcus (@saltire) & Laurel (@Pimpette)',
            ].join('\n'),
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
              '**drop** / **put *[object]*** - Drop an object.',
              '**say *[something]*** - Say something out loud.',
              '**score** - Show your current score.',
              '**credits** - See the credits.',
              '**restart** - Abandon your game and start again.',
              '**quit** - Abandon your game. You won\'t receive any further messages.',
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

    const [character, { users: currentUsers } = {}, { users: nextUsers } = {}] = await Promise.all([
      db.updateCharacter({ id: user.character.id, currentRoom: nextRoom }),
      db.getRoom(currentRoom),
      db.getRoom(nextRoom),
      db.addMove(user.character.id, currentRoom, nextRoom),
    ]);
    const updatedUser = { ...user, character };

    const toDir = { n: 'north', s: 'south', e: 'east', w: 'west' }[dir];
    const fromDir = { s: 'north', n: 'south', w: 'east', e: 'west' }[dir];

    return Promise.all([
      this.look(updatedUser),
      ...(currentUsers || []).filter(u => u.id !== user.id)
        .map(u => this.sendBox(u, `**${user.character.name}** goes away to the ${toDir}!`)),
      ...(nextUsers || []).filter(u => u.id !== user.id)
        .map(u => this.sendBox(u, `**${user.character.name}** appears from the ${fromDir}!`)),
    ]);
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
    await this.send(user, [
      'Hello, and welcome to CocoMUD!',
      'The game where you collect coconuts and explore as far as you possibly can. Break new paths! Or re-trample the old ones, though no one ever found coconuts that way.',
      'At any time, type `help` to see your list of commands.',
    ].join('\n'));
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
      await this.send(updatedUser, 'Remember, just type `help` for instructions.');
      await this.look(updatedUser);

      const { users } = (await db.getRoom([0, 0])) || {};
      await Promise.all((users || []).filter(u => u.id !== user.id)
        .map(u => this.sendBox(u, `**${character.name}** appears!`)));
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
      return this.sendBox(user, 'You can\'t carry any more coconuts! Try to find somewhere to drop them off.');
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
      `OK, you picked up ${newCount} coconut${newCount === 1 ? '' : 's'}! You now have ${character.coconuts || 0} coconut${character.coconuts === 1 ? '' : 's'}.`,
      character.coconuts >= maxCoconuts &&
        'You don\'t think you can carry any more! Better find some place to unload them.',
    ].filter(Boolean).join('\n'));
  }

  async drop(user) {
    if (user.character.coconuts === 0) {
      return this.sendBox(user, 'You aren\'t carrying any coconuts!');
    }

    const { objects } = await this.getRoom(user.character.currentRoom);
    if (objects.some(o => o.name === 'coconutrepository')) {
      const character = await db.updateCharacter({
        id: user.character.id,
        coconuts: 0,
        coconutsReturned: (user.character.coconutsReturned || 0) + user.character.coconuts,
      });
      await this.sendBox(user,
        'You drop all your coconuts in the repository\'s slot. It whirrs as they are whisked away, and for a few moments you see a bright orange beam cast up into the sky.');
      return this.sendBox(user,
        `You have dropped off a total of ${character.coconutsReturned} coconut${character.coconutsReturned === 1 ? '' : 's'}!`);
    }

    await db.updateCharacter({
      id: user.character.id,
      coconuts: 0,
    });
    return this.sendBox(user, 'You drop all your coconuts on the ground.');
  }

  async score(user) {
    return this.sendBox(user, `You are carrying ${user.character.coconuts || 0} coconut${user.character.coconuts === 1 ? '' : 's'}.`);
  }

  async credits(user) {
    const titleImg = new Discord.MessageAttachment(
      (await sprites.getSprite('credits')).buffer, 'credits.png');

    await this.send(user, {
      files: [titleImg],
      embed: {
        image: { url: 'attachment://credits.png' },
        footer: { text: 'Marcus Kamps (Programming), Laurel Kamps (Graphics)' },
      },
    });
  }

  async quit(user) {
    await this.send(user,
      'OK, thanks for playing! Send me another message if you\'d like to play again!');
    await db.updateUser({ id: user.id, characterId: null, disabled: true });
  }
};
