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

  // Methods

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
};
