require('dotenv').config();
const contentful = require('contentful-management');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function checkEntry() {
    try {
        console.log('Connecting to Contentful Management API...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        console.log('\nTrying to get movieList entry...');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        console.log('✓ Entry found!');
        console.log('Entry ID:', entry.sys.id);
        console.log('Content Type:', entry.sys.contentType.sys.id);

        const contents = entry.fields[process.env.CONTENTFUL_FIELD_ID]?.['en-US'];
        if (contents) {
            console.log('\n✓ Contents field exists!');
            console.log('Total items:', contents.length);

            const movies = contents.filter(i => i.media_type === 'movie' || (!i.media_type && !i.first_air_date));
            const tv = contents.filter(i => i.media_type === 'tv' || (!i.media_type && i.first_air_date));
            console.log('Movies:', movies.length);
            console.log('TV Shows:', tv.length);
        } else {
            console.log('\n✗ Contents field is empty or missing!');
        }

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.sys) {
            console.error('Error details:', JSON.stringify(error.sys, null, 2));
        }
    }
}

checkEntry();
