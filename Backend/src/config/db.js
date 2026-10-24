const mongoose = require('mongoose');

async function main(){
    if (!process.env.DB_CONNECT_STRING) {
        throw new Error('DB_CONNECT_STRING is missing from Backend/.env');
    }

    await mongoose.connect(process.env.DB_CONNECT_STRING, {
        serverSelectionTimeoutMS: 10000,
    });
}

module.exports = main;
