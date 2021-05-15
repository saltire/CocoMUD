'use strict';

const Sharp = require('sharp');

const db = require('./db');


const ts = 20;
const w = 20;
const h = 12;

let bufs;

const background = Sharp('./images/background1.gif');
const centre = Sharp('./images/Centre_0.gif');
const ns = [
  Sharp('./images/PathNS_0.gif'),
  Sharp('./images/PathNS_1.gif'),
  Sharp('./images/PathNS_2.gif'),
];
const ew = [
  Sharp('./images/PathEW_0.gif'),
  Sharp('./images/PathEW_1.gif'),
  Sharp('./images/PathEW_2.gif'),
];

module.exports = {
  async getBuffers() {
    if (!bufs) {
      const [backgroundB, centreB, nsB, ewB] = await Promise.all([
        background.toBuffer(),
        centre.toBuffer(),
        Promise.all(ns.map(img => img.toBuffer())),
        Promise.all(ew.map(img => img.toBuffer())),
      ]);

      bufs = { background: backgroundB, centre: centreB, ns: nsB, ew: ewB };
    }

    return bufs;
  },

  async drawScene(coords) {
    const buffers = await this.getBuffers();

    const [x, y] = coords;
    const paths = await db.getMoves(coords);
    const counts = {
      n: Math.min(paths.find(p => p.x === x && p.y === y - 1)?.count || 0, 3),
      s: Math.min(paths.find(p => p.x === x && p.y === y + 1)?.count || 0, 3),
      e: Math.min(paths.find(p => p.x === x + 1 && p.y === y)?.count || 0, 3),
      w: Math.min(paths.find(p => p.x === x - 1 && p.y === y)?.count || 0, 3),
    };

    return background
      .clone()
      .composite([
        { input: buffers.centre, top: ts * (h / 2 - 1), left: ts * (w / 2 - 1) },
        counts.n &&
          { input: buffers.ns[counts.n - 1], top: 0, left: ts * (w / 2 - 1) },
        counts.s &&
          { input: buffers.ns[counts.s - 1], top: ts * (h / 2 + 1), left: ts * (w / 2 - 1) },
        counts.e &&
          { input: buffers.ew[counts.e - 1], top: ts * (h / 2 - 1), left: ts * (w / 2 + 1) },
        counts.w &&
          { input: buffers.ew[counts.w - 1], top: ts * (h / 2 - 1), left: 0 },
      ].filter(Boolean))
      .png()
      .toBuffer();
  },
};
