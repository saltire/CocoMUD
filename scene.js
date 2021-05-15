'use strict';

const Sharp = require('sharp');

const db = require('./db');
const { choose, random, range } = require('./utils');


const ts = 20;
const w = 20;
const h = 12;

let sprs;

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

module.exports = {
  async getSprite(file) {
    const image = Sharp(`./sprites/${file}.gif`);
    const { width, height } = await image.metadata();
    return {
      image,
      buffer: await image.toBuffer(),
      tw: width / ts,
      th: height / ts,
    };
  },

  async getSprites() {
    if (!sprs) {
      sprs = {};
      await Promise.all(Object.entries(files).map(async ([id, file]) => {
        sprs[id] = await (Array.isArray(file) ?
          Promise.all(file.map(f => this.getSprite(f))) : this.getSprite(file));
      }));
    }

    return sprs;
  },

  async drawScene(coords) {
    const sprites = await this.getSprites();

    const [x, y] = coords;
    const pathUses = await db.getMoves(coords);
    const counts = {
      n: Math.min(pathUses.find(p => p.x === x && p.y === y - 1)?.count || 0, 3),
      s: Math.min(pathUses.find(p => p.x === x && p.y === y + 1)?.count || 0, 3),
      e: Math.min(pathUses.find(p => p.x === x + 1 && p.y === y)?.count || 0, 3),
      w: Math.min(pathUses.find(p => p.x === x - 1 && p.y === y)?.count || 0, 3),
    };
    const paths = [
      { input: sprites.centre.buffer, left: ts * (w / 2 - 1), top: ts * (h / 2 - 1) },
      counts.n &&
        { input: sprites.ns[counts.n - 1].buffer, left: ts * (w / 2 - 1), top: 0 },
      counts.s &&
        { input: sprites.ns[counts.s - 1].buffer, left: ts * (w / 2 - 1), top: ts * (h / 2 + 1) },
      counts.e &&
        { input: sprites.ew[counts.e - 1].buffer, left: ts * (w / 2 + 1), top: ts * (h / 2 - 1) },
      counts.w &&
        { input: sprites.ew[counts.w - 1].buffer, left: 0, top: ts * (h / 2 - 1) },
    ].filter(Boolean);

    const smallThings = {};
    range(random(50, 10)).forEach(() => {
      const tx = random(1) * (w / 2 + 1) + random(w / 2 - 2);
      const ty = random(1) * (h / 2 + 1) + random(h / 2 - 2);
      if (!smallThings[tx]?.[ty]) {
        smallThings[tx] = { ...smallThings[tx], [ty]: choose(sprites.small) };
      }
    });
    const smallImgs = Object.entries(smallThings)
      .flatMap(([tx, col]) => Object.entries(col)
        .map(([ty, sprite]) => ({ input: sprite.buffer, left: tx * ts, top: ty * ts })));

    return sprites.background.image
      .clone()
      .composite([
        ...paths,
        ...smallImgs,
      ])
      .png()
      .toBuffer();
  },
};
