'use strict';

const db = require('./db');
const sprites = require('./sprites');
const { choose, random, range } = require('./utils');


const ts = 20;
const w = 20;
const h = 12;

module.exports = {
  async createRoom(coords) {
    const { spriteTree } = await sprites.getSprites();

    const objects = [];
    range(random(100, 10)).forEach(() => {
      const tx = random(1) * (w / 2 + 1) + random(w / 2 - 2);
      const ty = random(1) * (h / 2 + 1) + random(h / 2 - 2);
      if (!objects.some(({ x, y }) => x === tx && y === ty)) {
        objects.push({ x: tx, y: ty, file: choose(spriteTree.small).file });
      }
    });

    return db.updateRoom({ coords, objects });
  },

  async drawScene(user) {
    const coords = user.currentRoom;
    const { objects } = (await db.getRoom(coords)) || await this.createRoom(coords);

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

    const objectImgs = objects.map(({ x: tx, y: ty, file }) => ({
      input: spriteList[file].buffer,
      left: tx * ts,
      top: ty * ts,
    }));

    const charSprite = spriteTree.characters[user.character];
    const character = {
      input: charSprite.buffer,
      left: (ts * w - charSprite.width) / 2,
      top: (ts * h - charSprite.height) / 2,
    };

    return spriteTree.background.image
      .clone()
      .composite([
        ...paths,
        ...objectImgs,
        character,
      ])
      .png()
      .toBuffer();
  },
};
