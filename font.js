'use strict';

const sharp = require('sharp');


const edscii = [
  ' !"#$%&\'()*+,-./',
  '0123456789:;<=>?',
  '@abcdefghijklmno',
  'pqrstuvwxyz[£]✓π',
  '█ABCDEFGHIJKLMNO',
  'PQRSTUVWXYZ♠♥♣♦●',
];

let chars;

module.exports = {
  async getFont() {
    const font = sharp('./images/c64_edscii.png');
    chars = {};

    await Promise.all(edscii.map(async (row, y) => {
      await Promise.all(row.split('').map(async (char, x) => {
        chars[char] = await font
          .extract({
            left: x * 8,
            top: y * 8,
            width: 8,
            height: 8,
          })
          .toBuffer();
      }));
    }));
  },

  async renderLine(message) {
    if (!chars) {
      await this.getFont();
    }

    const lines = message.split('\n');
    return sharp(
      {
        create: {
          width: Math.max(...lines.map(line => line.length)) * 8,
          height: lines.length * 8,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
      .composite(lines.flatMap((line, y) => line.split('').map((char, x) => ({
        input: chars[char] || chars[' '],
        top: y * 8,
        left: x * 8,
      }))))
      .png()
      .toBuffer();
  },
};
