'use strict';

// const Sharp = require('sharp');

const db = require('./db');


module.exports = {
  async drawScene(coords) {
    const [x, y] = coords;
    const paths = await db.getMoves(coords);
    const counts = {
      n: paths.find(p => p.x === x && p.y === y - 1)?.count || 0,
      s: paths.find(p => p.x === x && p.y === y + 1)?.count || 0,
      e: paths.find(p => p.x === x + 1 && p.y === y)?.count || 0,
      w: paths.find(p => p.x === x - 1 && p.y === y)?.count || 0,
    };
    console.log(counts);
  },
};
