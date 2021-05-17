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
    return (await this.collection('users'))
      .aggregate([
        { $match: { id } },
        {
          $lookup: {
            from: 'characters',
            foreignField: 'id',
            localField: 'characterId',
            as: 'character',
          },
        },
        { $unwind: { path: '$character', preserveNullAndEmptyArrays: true } },
      ])
      .toArray()
      .then(result => result[0]);
  },

  async updateUser(userData) {
    return (await this.collection('users'))
      .findOneAndUpdate(
        { id: userData.id },
        { $set: userData },
        { upsert: true, returnOriginal: false })
      .then(result => result.value);
  },

  // Characters

  async updateCharacter(charData) {
    return (await this.collection('characters'))
      .findOneAndUpdate(
        { id: charData.id },
        { $set: charData },
        { upsert: true, returnOriginal: false })
      .then(result => result.value);
  },

  async getTopRoomsVisited(limit) {
    return (await this.collection('characters'))
      .aggregate([
        {
          $lookup: {
            from: 'moves',
            foreignField: 'characterId',
            localField: 'id',
            as: 'moves',
          },
        },
        { $unwind: '$moves' },
        { $group: { _id: { id: '$id', name: '$name', to: '$moves.to' } } },
        { $group: { _id: '$_id.id', moves: { $sum: 1 }, name: { $first: '$_id.name' } } },
        { $sort: { moves: -1 } },
        { $limit: limit || 5 },
      ])
      .toArray();
  },

  async getTopMoves(limit) {
    return (await this.collection('characters'))
      .aggregate([
        { $lookup: { from: 'moves', foreignField: 'characterId', localField: 'id', as: 'moves' } },
        { $project: { name: 1, moves: { $size: '$moves' } } },
        { $match: { moves: { $gt: 0 } } },
        { $sort: { moves: -1 } },
        { $limit: limit || 5 },
      ])
      .toArray();
  },

  async getTopCoconutsReturned(limit) {
    return (await this.collection('characters'))
      .find({ coconutsReturned: { $gt: 0 } })
      .sort({ coconutsReturned: -1 })
      .limit(limit || 5)
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
            pipeline: [
              { $match: {} },
              {
                $lookup: {
                  from: 'characters',
                  foreignField: 'id',
                  localField: 'characterId',
                  as: 'character',
                },
              },
              { $unwind: '$character' },
              { $match: { 'character.currentRoom': coords } },
            ],
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

  async addMove(characterId, from, to) {
    return (await this.collection('moves')).insertOne({ characterId, from, to });
  },

  async getRoomMoves(coords) {
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

  // Messages

  async logMessage(userId, content) {
    return (await this.collection('messages'))
      .insertOne({ userId, content });
  },
};
