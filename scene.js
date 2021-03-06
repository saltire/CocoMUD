'use strict';

const db = require('./db');
const sprites = require('./sprites');
const { choose, random, range } = require('./utils');


const ts = 20;
const w = 20;
const h = 12;
const charDist = 1.25;

module.exports = {
  async createRoom(coords) {
    const { spriteTree } = await sprites.getSprites();

    const objects = [];

    const tryPlacingSprite = sprite => {
      const sx = random(1) * (w / 2 + 1) + random(w / 2 - 1 - sprite.bw);
      const sy = random(1) * (h / 2 + 1) + random(h / 2 - 1 - sprite.bh);
      for (let bx = sx; bx < sx + sprite.bw; bx += 1) {
        for (let by = sy; by < sy + sprite.bh; by += 1) {
          if (objects.some(({ bxmin, bxmax, bymin, bymax }) => (
            bx >= bxmin && bx <= bxmax && by >= bymin && by <= bymax))) {
            return;
          }
        }
      }
      objects.push({
        name: sprite.name,
        x: sx - sprite.bx,
        y: sy - sprite.by,
        bxmin: sx,
        bxmax: sx + sprite.bw - 1,
        bymin: sy,
        bymax: sy + sprite.bh - 1,
        nouns: sprite.nouns,
        canTake: sprite.canTake,
        ...sprite.hasCount ? { count: random(5, 2) } : {},
      });
    };

    if (coords[0] === -1 && coords[1] === 0) {
      objects.push({
        name: 'mapstartscreen_04',
        x: 0,
        y: 0,
        bxmin: 10,
        bxmax: w,
        bymin: 0,
        bymax: 6,
      });
    }
    else if (coords[0] === 0 && coords[1] === 0) {
      objects.push({
        name: 'mapstartscreen_05',
        x: 0,
        y: 0,
        bxmin: 0,
        bxmax: w,
        bymin: 0,
        bymax: 6,
      });
      tryPlacingSprite(choose(spriteTree.large));
      tryPlacingSprite(choose(spriteTree.large));
    }
    else if (coords[0] === 1 && coords[1] === 0) {
      objects.push({
        name: 'mapstartscreen_06',
        x: 0,
        y: 0,
        bxmin: 0,
        bxmax: 10,
        bymin: 0,
        bymax: 6,
      });
    }
    else if (coords[0] === -1 && coords[1] === -1) {
      objects.push({
        name: 'mapstartscreen_01',
        x: 0,
        y: 0,
        bxmin: 10,
        bxmax: w,
        bymin: 5,
        bymax: h,
      });
    }
    else if (coords[0] === 0 && coords[1] === -1) {
      objects.push({
        name: 'mapstartscreen_02',
        x: 0,
        y: 0,
        bxmin: 0,
        bxmax: w,
        bymin: 5,
        bymax: h,
      });
    }
    else if (coords[0] === 1 && coords[1] === -1) {
      objects.push({
        name: 'mapstartscreen_03',
        x: 0,
        y: 0,
        bxmin: 0,
        bxmax: w,
        bymin: 10,
        bymax: h,
      });
    }

    const startScreen = coords[0] === 0 && coords[1] === 0;

    const startingArea = (
      (coords[0] === -1 && coords[1] === -1) ||
      (coords[0] === 0 && coords[1] === -1) ||
      (coords[0] === 1 && coords[1] === -1) ||
      (coords[0] === -1 && coords[1] === 0) ||
      (coords[0] === 0 && coords[1] === 0) ||
      (coords[0] === 1 && coords[1] === 0));

    if ((coords[0] < -3 || coords[0] > 3 || coords[1] < -3 || coords[1] > 3) && !random(15)) {
      const left = random(1);
      objects.push({
        name: 'coconutrepository',
        x: left ? random(4, 2) : random(14, 12),
        y: 1,
        bxmin: left ? 1 : 12,
        bxmax: left ? 8 : 19,
        bymin: 7,
        bymax: 12,
      });
    }

    range(random(startScreen ? 3 : 10, 0)).forEach(() => {
      tryPlacingSprite(choose(spriteTree.large));
    });

    range(random(100, 10)).forEach(() => {
      tryPlacingSprite(choose(spriteTree.small));
    });

    if (!startingArea) {
      if (!random(3)) {
        const cocoSprite = choose(spriteTree.coconuts);
        range(random(5, 1)).forEach(() => {
          tryPlacingSprite(cocoSprite);
        });
      }

      if (!random(19)) {
        tryPlacingSprite(choose(spriteTree.goats));
      }
    }

    return db.updateRoom({
      coords,
      objects: objects
        .sort((a, b) => a.bymax - b.bymax),
    });
  },

  getDescription(user, room) {
    let description = 'You are in the wilderness.';
    if (room.coords[0] === 0 && room.coords[1] === 0) {
      description = 'You are standing on an alien world, beside the wreckage of your spaceship. Strange sights and smells surround you, from the coarse grass to the bright blue trees. Well, no sense standing around here mourning your terrible landing skills. You\'ve got to pick a direction and start hunting those coconuts!';
    }
    else if (room.coords[0] === 1 && room.coords[1] === 0) {
      description = 'You stand at the edge of your.. landing site. You can see a couple pieces of one of your ship\'s satellite dishes. It\'s really too bad - that was the one that picked up Space Cable, and you were really looking forward to the season finale of "Mercury Tim and the Space Hobos."';
    }
    else if (room.coords[0] === 1 && room.coords[1] === -1) {
      description = 'You stand a bit to the north of your ship, determinedly ignoring the cracked chunk of debris in the dirt. What did that even come off of, anyway? Shoddy worksmanship, that\'s what that is.';
    }
    else if (room.coords[0] === 0 && room.coords[1] === -1) {
      description = 'You stand just to the north of the smoking husk that was once your spaceship. You suppose it could have been worse. At least it didn\'t land upside-down... that emergency hatch just makes the most terrible screeching noise when it opens, and that\'s really the last thing your nerves needed today.';
    }
    else if (room.coords[0] === -1 && room.coords[1] === -1) {
      description = 'You stand to the north of your poor cracked spaceship. Well, really, it\'s only got itself to blame for this mess. No one ever told you that "autopilot" doesn\'t also mean "auto-land."';
    }
    else if (room.coords[0] === -1 && room.coords[1] === 0) {
      description = 'You stand in front of the nose of your cracked and smoking spaceship. You\'re not quite sure what exactly in that front compartment is capable of being on fire, but decide it\'s best not to think too hard about it. There is wilderness to be explored!';
    }
    else if (room.objects.filter(o => o.name.startsWith('tree')).length > 2) {
      description = 'You are in a forest.';
    }
    else if (room.objects.filter(o => o.name.startsWith('rock')).length > 15) {
      description = 'You are in a rocky area.';
    }
    else if (room.objects.length < 20) {
      description = 'You are in a grassy meadow.';
    }

    const notes = [];

    if (room.objects.some(o => o.name.startsWith('goat'))) {
      notes.push('A mysterious goat winks at you!');
    }

    const coconuts = room.objects.filter(o => o.name === 'coconut');
    const coconutpiles = room.objects.filter(o => o.name === 'coconutpile');
    if (coconuts.length) {
      notes.push(`You see ${coconuts.length === 1 ? 'a coconut' : `${coconuts.length} coconuts`}.`);
    }
    if (coconutpiles.length) {
      notes.push(`You see ${coconutpiles.length === 1 ? 'a pile' : `${coconutpiles.length} piles`}  of coconuts.`);
    }

    if (room.objects.some(o => o.name === 'coconutrepository')) {
      notes.push('A coconut repository looms overhead. Drop your coconuts here!');
    }

    return [
      description,
      ...notes,
      ...(room.users || []).filter(u => u.id !== user.id)
        .map(u => `**${u.character.name}** is here!`),
    ].join('\n');
  },

  async drawScene(user, room) {
    const { coords, objects, users } = room;

    const { spriteTree, spriteList } = await sprites.getSprites();

    const [x, y] = coords;
    const pathUses = await db.getRoomMoves(coords);
    const counts = {
      n: Math.min(pathUses.find(p => p.x === x && p.y === y - 1)?.count || 0, spriteTree.ns.length),
      s: Math.min(pathUses.find(p => p.x === x && p.y === y + 1)?.count || 0, spriteTree.ns.length),
      e: Math.min(pathUses.find(p => p.x === x + 1 && p.y === y)?.count || 0, spriteTree.ew.length),
      w: Math.min(pathUses.find(p => p.x === x - 1 && p.y === y)?.count || 0, spriteTree.ew.length),
    };
    const paths = [
      counts.n && {
        input: spriteTree.ns[counts.n - 1].buffer,
        left: ts * (w / 2 - 1),
        top: -ts,
      },
      counts.s && {
        input: spriteTree.ns[counts.s - 1].buffer,
        left: ts * (w / 2 - 1),
        top: ts * (h / 2),
      },
      counts.e && {
        input: spriteTree.ew[counts.e - 1].buffer,
        left: ts * (w / 2),
        top: ts * (h / 2 - 1),
      },
      counts.w && {
        input: spriteTree.ew[counts.w - 1].buffer,
        left: -ts,
        top: ts * (h / 2 - 1),
      },
    ].filter(Boolean);

    const topObjects = objects
      .filter(({ bymax }) => bymax <= h / 2)
      .map(({ name, x: tx, y: ty }) => ({
        input: spriteList[name].buffer,
        left: tx * ts,
        top: ty * ts,
      }));

    const charSprite = spriteTree.characters[user.character.type];
    const characters = [
      {
        input: charSprite.buffer,
        left: (ts * w - charSprite.width) / 2,
        top: (ts * h - charSprite.height) / 2,
      },
      ...(users || []).filter(u => u.id !== user.id).map(otherUser => {
        const otherCharSprite = spriteTree.characters[otherUser.character.type];
        const angle = Math.random() * Math.PI * 2;
        return {
          input: otherCharSprite.buffer,
          left: (ts * w - otherCharSprite.width) / 2 + Math.round(ts * charDist * Math.sin(angle)),
          top: (ts * h - otherCharSprite.height) / 2 + Math.round(ts * charDist * Math.cos(angle)),
        };
      }),
    ];

    const bottomObjects = objects
      .filter(({ bymax }) => bymax > h / 2)
      .map(({ name, x: tx, y: ty }) => ({
        input: spriteList[name].buffer,
        left: tx * ts,
        top: ty * ts,
      }));

    return spriteTree.background.image
      .clone()
      .composite([
        ...topObjects,
        ...paths,
        ...characters,
        ...bottomObjects,
      ])
      .png()
      .toBuffer();
  },
};
