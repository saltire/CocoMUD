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

let charsPromise;

module.exports = {
  async getFont() {
    if (!charsPromise) {
      const font = sharp('./sprites/c64_edscii.png');

      charsPromise = Promise
        .all(edscii
          .flatMap((row, y) => row.split('')
            .map(async (char, x) => [
              char,
              await font
                .extract({
                  left: x * 8,
                  top: y * 8,
                  width: 8,
                  height: 8,
                })
                .toBuffer(),
            ])))
        .then(entries => Object.fromEntries(entries));
    }

    return charsPromise;
  },

  async renderLine(message) {
    const chars = await this.getFont();

    const lines = message.split('\n');
    return sharp(
      {
        create: {
          width: Math.max(...lines.map(line => line.length)) * 8,
          height: lines.length * 8,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
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
