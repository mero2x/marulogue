require('dotenv').config();
const contentful = require('contentful-management');
const fs = require('fs');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function restore() {
    try {
        console.log('🔄 Loading backup data...');
        const movies = JSON.parse(fs.readFileSync('./data/imported_movies.json', 'utf8'));
        console.log(`✅ Loaded ${movies.length} movies from backup`);

        console.log('🔗 Connecting to Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        let entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        // Get current data to preserve any TV shows
        const currentData = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];
        console.log(`Current Contentful has ${currentData.length} items`);

        // Merge: keep TV shows from current, add movies from backup
        const currentTV = currentData.filter(item => item.media_type === 'tv');
        console.log(`Preserving ${currentTV.length} TV shows`);

        const mergedData = [...movies, ...currentTV];
        console.log(`Merged total: ${mergedData.length} items`);

        console.log('💾 Saving to Contentful...');
        entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] = mergedData;
        entry = await entry.update();
        await entry.publish();

        console.log('✅ Restore complete!');
        console.log(`  - ${movies.length} movies`);
        console.log(`  - ${currentTV.length} TV shows`);
        console.log(`  - ${mergedData.length} total`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

restore();
