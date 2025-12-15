// Quick diagnostic to check what's in Contentful
require('dotenv').config();
const contentful = require('contentful-management');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function checkData() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        const movies = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];

        // Find Supernatural
        const supernatural = movies.find(m => m.title?.toLowerCase().includes('supernatural') || m.name?.toLowerCase().includes('supernatural'));

        console.log('\n=== SUPERNATURAL DATA ===');
        if (supernatural) {
            console.log('ID:', supernatural.id);
            console.log('Title:', supernatural.title || supernatural.name);
            console.log('Rating:', supernatural.rating);
            console.log('Poster:', supernatural.poster_path);
            console.log('Media Type:', supernatural.media_type);
        } else {
            console.log('Supernatural not found in Contentful');
        }

        console.log('\n=== TV SHOWS COUNT ===');
        const tvShows = movies.filter(m => {
            const type = m.media_type || (m.first_air_date ? 'tv' : 'movie');
            return type === 'tv';
        });
        console.log(`Total TV shows: ${tvShows.length}`);

        console.log('\n=== RECENT ADDITIONS ===');
        const recent = movies
            .filter(m => m.dateWatched)
            .sort((a, b) => new Date(b.dateWatched) - new Date(a.dateWatched))
            .slice(0, 5);

        recent.forEach(m => {
            console.log(`- ${m.title || m.name} (${m.media_type || 'movie'}) - Added: ${m.dateWatched} - Rating: ${m.rating}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkData();
