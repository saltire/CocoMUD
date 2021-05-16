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

    range(random(10, 0)).forEach(() => {
      tryPlacingSprite(choose(spriteTree.large));
    });

    range(random(100, 10)).forEach(() => {
      tryPlacingSprite(choose(spriteTree.small));
    });

    if (!((coords[0] === -1 && coords[1] === -1) ||
      (coords[0] === 0 && coords[1] === -1) ||
      (coords[0] === 1 && coords[1] === -1) ||
      (coords[0] === -1 && coords[1] === 0) ||
      (coords[0] === 0 && coords[1] === 0) ||
      (coords[0] === 1 && coords[1] === 0))) {
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
    if (room.objects.length < 20) {
      description = 'You are in a grassy meadow.';
    }
    else if (room.objects.filter(o => o.name.startsWith('tree')).length > 2) {
      description = 'You are in a forest.';
    }
    else if (room.objects.filter(o => o.name.startsWith('rock')).length > 15) {
      description = 'You are in a rocky area.';
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
