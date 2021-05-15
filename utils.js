'use strict';


module.exports = {
  choose: array => array[module.exports.random(array.length - 1)],

  random: (max, min = 0) => Math.floor(Math.random() * (max - min + 1)) + min,

  range: length => [...Array(length).keys()],
};
