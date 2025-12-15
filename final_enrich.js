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

async function enrichAllData() {
    console.log('='.repeat(60));
    console.log('  COMPLETE DATA ENRICHMENT - ONE TIME FIX');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Step 1: Load from Contentful
        console.log('📥 Loading data from Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        let allItems = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];
        console.log(`   Loaded ${allItems.length} total items\n`);

        let enrichedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const startTime = Date.now();

        // Step 2: Enrich each item
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            const isTV = item.media_type === 'tv' || (!item.media_type && item.first_air_date);
            const title = item.title || item.name;

            // Check if already has data
            if (isTV) {
                if (item.creator && item.creator !== 'Unknown' && item.origin_country && item.origin_country.length > 0) {
                    skippedCount++;
                    continue;
                }
            } else {
                if (item.director && item.director !== 'Unknown' && item.production_countries && item.production_countries.length > 0) {
                    skippedCount++;
                    continue;
                }
            }

            const progress = Math.round((i / allItems.length) * 100);
            process.stdout.write(`\r[${progress}%] ${i + 1}/${allItems.length} - ${title.substring(0, 35).padEnd(35)}...`);

            try {
                if (isTV) {
                    // TV Show - fetch details
                    const response = await axios.get(`${BASE_URL}/tv/${item.id}?api_key=${TMDB_API_KEY}`);
                    const data = response.data;

                    allItems[i].creator = data.created_by?.map(c => c.name).join(', ') || 'Unknown';
                    allItems[i].origin_country = data.origin_country || [];
                    allItems[i].media_type = 'tv'; // Ensure type is set
                } else {
                    // Movie - fetch details + credits
                    const [detailsRes, creditsRes] = await Promise.all([
                        axios.get(`${BASE_URL}/movie/${item.id}?api_key=${TMDB_API_KEY}`),
                        axios.get(`${BASE_URL}/movie/${item.id}/credits?api_key=${TMDB_API_KEY}`)
                    ]);

                    const director = creditsRes.data.crew?.find(c => c.job === 'Director');
                    allItems[i].director = director ? director.name : 'Unknown';
                    allItems[i].production_countries = detailsRes.data.production_countries?.map(c => c.iso_3166_1) || [];
                    allItems[i].media_type = 'movie'; // Ensure type is set
                }

                enrichedCount++;

                // Rate limiting - 200ms between requests
                await delay(200);

            } catch (err) {
                errorCount++;
                // Still set media_type even on error
                if (!allItems[i].media_type) {
                    allItems[i].media_type = isTV ? 'tv' : 'movie';
                }
            }
        }

        console.log('\n');

        // Step 3: Save everything to Contentful (ONE atomic write)
        console.log('💾 Saving all data to Contentful...');
        entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] = allItems;
        const updatedEntry = await entry.update();
        await updatedEntry.publish();
        console.log('   ✅ Save & Publish complete!\n');

        // Summary
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log('='.repeat(60));
        console.log('  ENRICHMENT COMPLETE');
        console.log('='.repeat(60));
        console.log(`  ✅ Enriched: ${enrichedCount}`);
        console.log(`  ⏭️  Skipped (already had data): ${skippedCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📊 Total items: ${allItems.length}`);
        console.log(`  ⏱️  Duration: ${duration} seconds`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error);
    }
}

enrichAllData();
