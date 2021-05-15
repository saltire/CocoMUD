'use strict';

const Sharp = require('sharp');

const db = require('./db');
const { choose, random, range } = require('./utils');


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
const small = [
  Sharp('./images/rock1.gif'),
  Sharp('./images/rock2.gif'),
  Sharp('./images/rock3.gif'),
  Sharp('./images/smallfern1.gif'),
  Sharp('./images/smallfern2.gif'),
];

module.exports = {
  async getBuffers() {
    if (!bufs) {
      const [backgroundB, centreB, nsB, ewB, smallB] = await Promise.all([
        background.toBuffer(),
        centre.toBuffer(),
        Promise.all(ns.map(img => img.toBuffer())),
        Promise.all(ew.map(img => img.toBuffer())),
        Promise.all(small.map(img => img.toBuffer())),
      ]);

      bufs = { background: backgroundB, centre: centreB, ns: nsB, ew: ewB, small: smallB };
    }

    return bufs;
  },

  async drawScene(coords) {
    const buffers = await this.getBuffers();

    const [x, y] = coords;
    const pathUses = await db.getMoves(coords);
    const counts = {
      n: Math.min(pathUses.find(p => p.x === x && p.y === y - 1)?.count || 0, 3),
      s: Math.min(pathUses.find(p => p.x === x && p.y === y + 1)?.count || 0, 3),
      e: Math.min(pathUses.find(p => p.x === x + 1 && p.y === y)?.count || 0, 3),
      w: Math.min(pathUses.find(p => p.x === x - 1 && p.y === y)?.count || 0, 3),
    };
    const paths = [
      { input: buffers.centre, left: ts * (w / 2 - 1), top: ts * (h / 2 - 1) },
      counts.n &&
        { input: buffers.ns[counts.n - 1], left: ts * (w / 2 - 1), top: 0 },
      counts.s &&
        { input: buffers.ns[counts.s - 1], left: ts * (w / 2 - 1), top: ts * (h / 2 + 1) },
      counts.e &&
        { input: buffers.ew[counts.e - 1], left: ts * (w / 2 + 1), top: ts * (h / 2 - 1) },
      counts.w &&
        { input: buffers.ew[counts.w - 1], left: 0, top: ts * (h / 2 - 1) },
    ].filter(Boolean);

    const smallThings = {};
    range(random(50, 10)).forEach(() => {
      const tx = random(1) * (w / 2 + 1) + random(w / 2 - 2);
      const ty = random(1) * (h / 2 + 1) + random(h / 2 - 2);
      if (!smallThings[tx]?.[ty]) {
        smallThings[tx] = { ...smallThings[tx], [ty]: choose(buffers.small) };
      }
    });
    const smallImgs = Object.entries(smallThings)
      .flatMap(([tx, col]) => Object.entries(col)
        .map(([ty, buf]) => ({ input: buf, left: tx * ts, top: ty * ts })));

    return background
      .clone()
      .composite([
        ...paths,
        ...smallImgs,
      ])
      .png()
      .toBuffer();
  },
};
