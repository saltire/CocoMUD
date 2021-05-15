'use strict';

const Sharp = require('sharp');

const db = require('./db');
const { choose, random, range } = require('./utils');


const ts = 20;
const w = 20;
const h = 12;

const files = {
  background: 'background1',
  centre: 'Centre_0',
  ns: [
    'PathNS_0',
    'PathNS_1',
    'PathNS_2',
  ],
  ew: [
    'PathEW_0',
    'PathEW_1',
    'PathEW_2',
  ],
  small: [
    'rock1',
    'rock2',
    'rock3',
    'smallfern1',
    'smallfern2',
  ],
};
let sprTree;
let sprList;

module.exports = {
  async getSprite(file) {
    const image = Sharp(`./sprites/${file}.gif`);
    const { width, height } = await image.metadata();
    return {
      file,
      image,
      buffer: await image.toBuffer(),
      tw: width / ts,
      th: height / ts,
    };
  },

  async getSprites() {
    if (!sprTree) {
      sprTree = {};
      sprList = {};
      await Promise.all(Object.entries(files).map(async ([id, file]) => {
        if (Array.isArray(file)) {
          sprTree[id] = await Promise.all(file.map(f => this.getSprite(f)));
          sprTree[id].forEach(sprite => {
            sprList[sprite.file] = sprite;
          });
        }
        else {
          sprTree[id] = await this.getSprite(file);
          sprList[file] = sprTree[id];
        }
      }));
    }

    return { spriteTree: sprTree, spriteList: sprList };
  },

  async createRoom(coords) {
    const { spriteTree } = await this.getSprites();

    const objects = [];
    range(random(50, 10)).forEach(() => {
      const tx = random(1) * (w / 2 + 1) + random(w / 2 - 2);
      const ty = random(1) * (h / 2 + 1) + random(h / 2 - 2);
      if (!objects.some(({ x, y }) => x === tx && y === ty)) {
        objects.push({ x: tx, y: ty, file: choose(spriteTree.small).file });
      }
    });

    return db.updateRoom({ coords, objects });
  },

  async drawScene(coords) {
    const { objects } = (await db.getRoom(coords)) || await this.createRoom(coords);

    const { spriteTree, spriteList } = await this.getSprites();

    const [x, y] = coords;
    const pathUses = await db.getMoves(coords);
    const counts = {
      n: Math.min(pathUses.find(p => p.x === x && p.y === y - 1)?.count || 0, 3),
      s: Math.min(pathUses.find(p => p.x === x && p.y === y + 1)?.count || 0, 3),
      e: Math.min(pathUses.find(p => p.x === x + 1 && p.y === y)?.count || 0, 3),
      w: Math.min(pathUses.find(p => p.x === x - 1 && p.y === y)?.count || 0, 3),
    };
    const paths = [
      {
        input: spriteTree.centre.buffer,
        left: ts * (w / 2 - 1),
        top: ts * (h / 2 - 1),
      },
      counts.n && {
        input: spriteTree.ns[counts.n - 1].buffer,
        left: ts * (w / 2 - 1),
        top: 0,
      },
      counts.s && {
        input: spriteTree.ns[counts.s - 1].buffer,
        left: ts * (w / 2 - 1),
        top: ts * (h / 2 + 1),
      },
      counts.e && {
        input: spriteTree.ew[counts.e - 1].buffer,
        left: ts * (w / 2 + 1),
        top: ts * (h / 2 - 1),
      },
      counts.w && {
        input: spriteTree.ew[counts.w - 1].buffer,
        left: 0,
        top: ts * (h / 2 - 1),
      },
    ].filter(Boolean);

    const objectImgs = objects.map(({ x: tx, y: ty, file }) => ({
      input: spriteList[file].buffer,
      left: tx * ts,
      top: ty * ts,
    }));

    return spriteTree.background.image
      .clone()
      .composite([
        ...paths,
        ...objectImgs,
      ])
      .png()
      .toBuffer();
  },
};
