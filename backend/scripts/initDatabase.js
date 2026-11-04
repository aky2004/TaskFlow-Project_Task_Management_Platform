const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

const modelsDir = path.join(__dirname, '..', 'models');

async function syncAndPushSchemas() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB Atlas...');
  console.log(`📡 Cluster endpoint: ${uri.split('@')[1] ? uri.split('@')[1].split('/')[0] : 'hidden'}`);

  await mongoose.connect(uri);
  console.log('✅ Connected successfully to MongoDB Atlas!\n');

  const modelFiles = fs
    .readdirSync(modelsDir)
    .filter((file) => file.endsWith('.js'));

  console.log(`📦 Found ${modelFiles.length} models in backend/models/ to synchronize:\n`);

  const results = [];

  for (const file of modelFiles) {
    try {
      const modelPath = path.join(modelsDir, file);
      const model = require(modelPath);

      if (!model || !model.modelName) {
        console.warn(`⚠️  Skipping ${file}: Not a valid Mongoose model`);
        continue;
      }

      const collectionName = model.collection.name;

      // Ensure collection exists physically in Atlas
      const collections = await mongoose.connection.db
        .listCollections({ name: collectionName })
        .toArray();

      if (collections.length === 0) {
        await mongoose.connection.db.createCollection(collectionName);
        console.log(`  ➕ Created collection: [${collectionName}] (Model: ${model.modelName})`);
      } else {
        console.log(`  ✓ Collection exists: [${collectionName}] (Model: ${model.modelName})`);
      }

      // Sync and build indexes (e.g., unique email, compound keys, TTL)
      const indexResult = await model.syncIndexes();
      const existingIndexes = await model.collection.indexes();

      results.push({
        model: model.modelName,
        collection: collectionName,
        indexes: existingIndexes.map((idx) => Object.keys(idx.key).join(', ')),
      });
    } catch (err) {
      console.error(`  ❌ Error initializing ${file}:`, err.message);
    }
  }

  console.log('\n================ SCHEMA SYNC SUMMARY ================');
  console.table(
    results.map((r) => ({
      Model: r.model,
      Collection: r.collection,
      'Indexes Built': r.indexes.join(' | '),
    }))
  );

  console.log('\n🎉 All database schemas and indexes successfully pushed to MongoDB Atlas!');
  await mongoose.disconnect();
  console.log('🔌 Connection closed.');
}

syncAndPushSchemas().catch((err) => {
  console.error('Fatal error during database push:', err);
  process.exit(1);
});
