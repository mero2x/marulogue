require('dotenv').config();
const contentful = require('contentful-management');
const axios = require('axios');

const TMDB_API_KEY = '5c9cef63f6816c9678256d7eb09b6ccc';
const BASE_URL = 'https://api.themoviedb.org/3';

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichTV() {
    try {
        console.log('🔗 Connecting to Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        let entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        let allItems = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];

        // Filter to only TV shows
        const tvShows = allItems.filter(item => {
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            return type === 'tv';
        });

        console.log(`✅ Found ${tvShows.length} TV shows. Starting enrichment...`);

        let updatedCount = 0;

        for (let i = 0; i < tvShows.length; i++) {
            const show = tvShows[i];

            // Skip if already has creator data
            if (show.creator || show.created_by) {
                console.log(`[${i + 1}/${tvShows.length}] Skipping: ${show.name || show.title} (already enriched)`);
                continue;
            }

            console.log(`[${i + 1}/${tvShows.length}] Enriching: ${show.name || show.title} (${show.id})...`);

            try {
                // Fetch TV details from TMDB
                const response = await axios.get(`${BASE_URL}/tv/${show.id}?api_key=${TMDB_API_KEY}`);
                const data = response.data;

                // Extract Creator
                let creator = 'Unknown';
                if (data.created_by && data.created_by.length > 0) {
                    creator = data.created_by.map(c => c.name).join(', ');
                }

                // Extract Countries
                const countries = data.origin_country || [];

                // Find and update in the full list
                const indexInFull = allItems.findIndex(item => item.id === show.id);
                if (indexInFull !== -1) {
                    allItems[indexInFull].creator = creator;
                    allItems[indexInFull].origin_country = countries;
                    updatedCount++;
                    console.log(`  ✓ Creator: ${creator}, Countries: ${countries.join(', ')}`);
                }

                // Rate limiting
                await delay(250);

            } catch (err) {
                console.error(`❌ Failed to enrich ${show.name || show.title}: ${err.message}`);
            }
        }

        if (updatedCount > 0) {
            console.log(`\n💾 Saving ${updatedCount} updates...`);
            entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] = allItems;
            entry = await entry.update();
            await entry.publish();
            console.log('✅ Save & Publish Complete!');
        } else {
            console.log('✨ No updates needed.');
        }

    } catch (error) {
        console.error('❌ Script failed:', error);
    }
}

enrichTV();
