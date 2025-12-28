const mongoose = require('mongoose');
require('dotenv').config(); 

const fixIndex = async () => {
  try {
    let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gradus';
    if (uri.includes('localhost')) {
        uri = uri.replace('localhost', '127.0.0.1');
        console.log('Switched localhost to 127.0.0.1');
    }
    console.log('Connecting to:', uri.replace(/:([^:@]{1,})@/, ':****@')); 

    await mongoose.connect(uri);
    console.log('Connected. State:', mongoose.connection.readyState);

    const collectionList = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections Found:', collectionList.map(c => c.name));
    
    // Case-insensitive match for "assessmentattempts"
    const targetCol = collectionList.find(c => c.name.toLowerCase() === 'assessmentattempts');

    if (!targetCol) {
        console.log('❌ Collection "assessmentattempts" NOT FOUND. Database might be empty or wrong DB name.');
        console.log('Current DB Name:', mongoose.connection.db.databaseName);
        console.log('Is this the correct database? Check .env MONGO_URI.');
        process.exit(0);
    }

    const collection = mongoose.connection.collection(targetCol.name);
    console.log(`✅ Using collection: ${targetCol.name}`);
    
    const indexName = 'userId_1_courseSlug_1_moduleIndex_1_weekIndex_1';
    const indexes = await collection.indexes();
    const exists = indexes.find(idx => idx.name === indexName);

    if (exists) {
        console.log(`Found index ${indexName}. Dropping...`);
        await collection.dropIndex(indexName);
        console.log('✅ Index dropped successfully.');
    } else {
        console.log(`ℹ️ Index ${indexName} not found. Safe to proceed.`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

fixIndex();
