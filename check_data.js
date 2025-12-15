require('dotenv').config();
const contentful = require('contentful');

const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
});

async function check() {
    const entry = await client.getEntry('movieList');

    // Find Love Bites (id: 1581164)
    const loveBites = entry.fields.contents.find(i => i.id === 1581164);
    console.log('\nLove Bites (id: 1581164):');
    console.log('  production_countries:', JSON.stringify(loveBites?.production_countries));
    console.log('  original_language:', loveBites?.original_language);

    // Find Spotting a Cow (id: 289475)
    const spottingCow = entry.fields.contents.find(i => i.id === 289475);
    console.log('\nSpotting a Cow (id: 289475):');
    console.log('  production_countries:', JSON.stringify(spottingCow?.production_countries));
    console.log('  original_language:', spottingCow?.original_language);
}

check().catch(console.error);
