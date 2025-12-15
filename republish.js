require('dotenv').config();
const contentful = require('contentful-management');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function republish() {
    try {
        console.log('🔗 Connecting...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        let entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        const movies = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];
        console.log(`Current count: ${movies.length} items`);

        console.log('📝 Republishing to bust CDN cache...');
        await entry.publish();

        console.log('✅ Republished! CDN should refresh within 60 seconds.');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

republish();
