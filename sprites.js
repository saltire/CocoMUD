'use strict';

const sharp = require('sharp');

const font = require('./font');
const { range } = require('./utils');


const ts = 20;

const files = {
  background: 'background1',
  ns: range(10).map(i => `Path_NS_${i + 1}`),
  ew: range(10).map(i => `Path_E_${i + 1}`),
  small: [
    'grass1',
    'grass2',
    'rock1',
    'rock2',
    'rock3',
    'smallfern1',
    'smallfern2',
  ],
  characters: [
    'guy2',
    'guy3',
  ],
};
let spritesPromise;

let characterImg;

module.exports = {
  async getSprite(file) {
    const image = sharp(`./sprites/${file}.gif`);
    const { width, height } = await image.metadata();
    return {
      file,
      image,
      buffer: await image.toBuffer(),
      width,
      height,
      tw: width / ts,
      th: height / ts,
    };
  },

  async getSprites() {
    if (!spritesPromise) {
      const spriteTree = {};
      const spriteList = {};
      spritesPromise = Promise
        .all(Object.entries(files).map(async ([id, file]) => {
          if (Array.isArray(file)) {
            spriteTree[id] = await Promise.all(file.map(f => this.getSprite(f)));
            spriteTree[id].forEach(sprite => {
              spriteList[sprite.file] = sprite;
            });
          }
          else {
            spriteTree[id] = await this.getSprite(file);
            spriteList[file] = spriteTree[id];
          }
        }))
        .then(() => ({ spriteTree, spriteList }));
    }

    return spritesPromise;
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
