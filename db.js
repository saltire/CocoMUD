'use strict';

const { MongoClient } = require('mongodb');


const { MONGODB_URI } = process.env;

let dbPromise;

module.exports = {
  async connectToDB(uri) {
    const client = await MongoClient
      .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
      .catch(err => {
        console.error('MongoDB connection error:', err);
        throw err;
      });

    process.on('exit', () => {
      console.log('Closing MongoDB connection...');
      client.close(false);
    });

    const db = client.db();

    return db;
  },

  async db() {
    if (!dbPromise) {
      dbPromise = this.connectToDB(MONGODB_URI);
    }
    return dbPromise;
  },

  async collection(name) {
    return (await this.db()).collection(name);
  },

  // Users

  async getUser(id) {
    return (await this.collection('users')).findOne({ id });
  },

  async updateUser(userData) {
    return (await this.collection('users'))
      .findOneAndUpdate(
        { id: userData.id },
        { $set: userData },
        { upsert: true, returnOriginal: false })
      .then(result => result.value);
  },

  async getTopRoomsVisited(limit) {
    return (await this.collection('users'))
      .aggregate([
        { $lookup: { from: 'moves', foreignField: 'userId', localField: 'id', as: 'moves' } },
        { $project: { id: 1, character: 1, moves: { $size: '$moves' } } },
        { $sort: { moves: -1 } },
        { $limit: limit || 5 },
      ])
      .toArray();
  },

  // Rooms

  async getRoom(coords) {
    return (await this.collection('rooms'))
      .aggregate([
        { $match: { coords } },
        {
          $lookup: {
            from: 'users',
            let: { coords: '$coords' },
            pipeline: [{ $match: { $expr: { $eq: ['$currentRoom', '$$coords'] } } }],
            as: 'users',
          },
        },
      ])
      .toArray()
      .then(results => results[0]);
  },

  async updateRoom(roomData) {
    return (await this.collection('rooms'))
      .findOneAndUpdate(
        { coords: roomData.coords },
        { $set: roomData },
        { upsert: true, returnOriginal: false })
      .then(result => result.value);
  },

  // Moves

  async addMove(userId, from, to) {
    return (await this.collection('moves')).insertOne({ userId, from, to });
  },

  async getMoves(coords) {
    return (await this.collection('moves'))
      .aggregate([
        { $match: { $or: [{ from: coords }, { to: coords }] } },
        { $project: { room: ['$from', '$to'] } },
        { $unwind: '$room' },
        { $match: { room: { $ne: coords } } },
        { $group: { _id: '$room', count: { $sum: 1 } } },
        { $project: { x: { $first: '$_id' }, y: { $last: '$_id' }, count: 1 } },
      ])
      .toArray();
  },
};
