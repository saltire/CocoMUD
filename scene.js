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
      });
    };

    range(random(5, 0)).forEach(() => {
      tryPlacingSprite(choose(spriteTree.large));
    });

    range(random(75, 10)).forEach(() => {
      tryPlacingSprite(choose(spriteTree.small));
    });

    return db.updateRoom({
      coords,
      objects: objects
        .sort((a, b) => a.bymax - b.bymax),
    });
  },

  async drawScene(user) {
    const coords = user.currentRoom;
    const { objects, users } = (await db.getRoom(coords)) || await this.createRoom(coords);

    const { spriteTree, spriteList } = await sprites.getSprites();

    const [x, y] = coords;
    const pathUses = await db.getMoves(coords);
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

    const charSprite = spriteTree.characters[user.character];
    const characters = [
      {
        input: charSprite.buffer,
        left: (ts * w - charSprite.width) / 2,
        top: (ts * h - charSprite.height) / 2,
      },
      ...(users || []).filter(u => u.id !== user.id).map(otherUser => {
        const otherCharSprite = spriteTree.characters[otherUser.character];
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
        ...paths,
        ...topObjects,
        ...characters,
        ...bottomObjects,
      ])
      .png()
      .toBuffer();
  },
};
