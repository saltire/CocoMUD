'use strict';

const sharp = require('sharp');

const font = require('./font');
const sprites = require('./sprites');


let characterImg;

module.exports = {
  async getCharacterScreen() {
    if (!characterImg) {
      const { spriteTree: { characters } } = await sprites.getSprites();

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
