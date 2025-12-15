require('dotenv').config();
const contentful = require('contentful-management');
const fs = require('fs');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function fullRestore() {
    try {
        console.log('📂 Loading backup...');
        const backup = JSON.parse(fs.readFileSync('./data/imported_movies.json', 'utf8'));
        console.log(`Loaded ${backup.length} items from backup`);

        console.log('🔗 Connecting to Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        let entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        // Completely replace with backup data
        console.log('💾 Restoring data...');
        entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] = backup;

        entry = await entry.update();
        console.log('📤 Publishing...');
        await entry.publish();

        console.log('✅ Full restore complete!');
        console.log(`Total items: ${backup.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fullRestore();
