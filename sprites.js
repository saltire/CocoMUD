'use strict';

const sharp = require('sharp');

const font = require('./font');
const { range } = require('./utils');


const ts = 20;

const files = {
  title: { name: 'title' },
  background: { name: 'background2' },
  ns: range(10).map(i => ({ name: `Path_NS_${i + 1}` })),
  ew: range(10).map(i => ({ name: `Path_E_${i + 1}` })),
  small: [
    { name: 'grass1' },
    { name: 'grass2' },
    { name: 'rock1' },
    { name: 'rock2' },
    { name: 'rock3' },
    { name: 'smallfern1' },
    { name: 'smallfern2' },
  ],
  large: [
    { name: 'fern', bw: 2, bh: 1, bx: 0, by: 1 },
    { name: 'tree_froot1', bw: 2, bh: 2, bx: 1, by: 4 },
    { name: 'tree_hole', bw: 3, bh: 2, bx: 1, by: 4 },
  ],
  goats: [
    { name: 'goatonapole', bw: 1, bh: 1, bx: 0, by: 1 },
  ],
  coconuts: [
    { name: 'coconut', nouns: ['coconut', 'coconuts', 'nut', 'nuts'], canTake: true },
    { name: 'coconutpile', bw: 2, bh: 1, bx: 0, by: 1, nouns: ['coconut', 'coconuts', 'nut', 'nuts', 'pile', 'piles'], canTake: true, hasCount: true },
  ],
  characters: [
    { name: 'guy2' },
    { name: 'guy3' },
  ],
};
let spritesPromise;

let characterImg;

module.exports = {
  async loadSprite({ name, ...data }) {
    const image = sharp(`./sprites/${name}.gif`);
    const { width, height } = await image.metadata();
    const tw = Math.ceil(width / ts);
    const th = Math.ceil(height / ts);
    return {
      name,
      image,
      buffer: await image.toBuffer(),
      width,
      height,
      tw,
      th,
      bw: tw,
      bh: th,
      bx: 0,
      by: 0,
      ...data,
    };
  },

  async getSprites() {
    if (!spritesPromise) {
      const spriteTree = {};
      const spriteList = {};
      spritesPromise = Promise
        .all(Object.entries(files).map(async ([id, file]) => {
          if (Array.isArray(file)) {
            spriteTree[id] = await Promise.all(file.map(f => this.loadSprite(f)));
            spriteTree[id].forEach(sprite => {
              spriteList[sprite.name] = sprite;
            });
          }
          else {
            spriteTree[id] = await this.loadSprite(file);
            spriteList[file.name] = spriteTree[id];
          }
        }))
        .then(() => ({ spriteTree, spriteList }));
    }

    return spritesPromise;
  },

  async getSprite(name) {
    const { spriteTree } = await this.getSprites();
    return spriteTree[name];
  },

  async getCharacters() {
    if (!characterImg) {
      const { spriteTree: { characters } } = await this.getSprites();

      const cw = 50;
      const ch = 50;
      const th = 20;

      const comps = (await Promise.all(characters.map(async (char, i) => [
        {
          input: char.buffer,
          left: cw * (i + 0.5) - Math.floor(char.width / 2),
          top: cw / 2 - Math.floor(char.height / 2),
        },
        {
          input: await font.renderLine(`${i + 1}`),
          left: cw * (i + 0.5) - 4,
          top: ch + th / 2 - 4,
        },
      ]))).flat();

      characterImg = sharp(
        {
          create: {
            width: characters.length * 50,
            height: 70,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
        .composite(comps)
        .png()
        .toBuffer();
    }

    return characterImg;
  },
};
