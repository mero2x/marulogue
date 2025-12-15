require('dotenv').config();
const contentful = require('contentful-management');

// Fields to REMOVE
const REMOVE_FIELDS = [
    'genre_ids',
    'overview',
    'popularity',
    'vote_average',
    'vote_count',
    'adult',
    'dateWatched',
    'video',
    'original_language',
    'original_title',
    'original_name',
    'backdrop_path'
];

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function cleanNewEntries() {
    console.log('='.repeat(60));
    console.log('  CLEAN NEW ENTRIES ONLY (Safe Operation)');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Step 1: Get current data
        console.log('📥 Fetching current data from Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        const items = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];

        // Count before
        const moviesBefore = items.filter(i => i.media_type === 'movie' || (!i.media_type && !i.first_air_date)).length;
        const tvBefore = items.filter(i => i.media_type === 'tv' || (!i.media_type && i.first_air_date)).length;

        console.log(`\n✅ BEFORE:`);
        console.log(`   Total items: ${items.length}`);
        console.log(`   Movies: ${moviesBefore}`);
        console.log(`   TV Shows: ${tvBefore}`);

        // Step 2: Find entries with bloated fields
        let cleanedCount = 0;
        const cleanedItems = items.map(item => {
            let hadBloat = false;
            const cleaned = {};

            Object.keys(item).forEach(key => {
                if (REMOVE_FIELDS.includes(key)) {
                    hadBloat = true;
                } else {
                    cleaned[key] = item[key];
                }
            });

            if (hadBloat) {
                cleanedCount++;
                console.log(`   🧹 Cleaned: ${item.title || item.name}`);
            }

            return cleaned;
        });

        // Step 3: Verify counts match
        const moviesAfter = cleanedItems.filter(i => i.media_type === 'movie' || (!i.media_type && !i.first_air_date)).length;
        const tvAfter = cleanedItems.filter(i => i.media_type === 'tv' || (!i.media_type && i.first_air_date)).length;

        console.log(`\n✅ AFTER CLEANING:`);
        console.log(`   Total items: ${cleanedItems.length}`);
        console.log(`   Movies: ${moviesAfter}`);
        console.log(`   TV Shows: ${tvAfter}`);
        console.log(`   Cleaned: ${cleanedCount} items`);

        if (cleanedItems.length !== items.length) {
            throw new Error(`ABORT: Item count changed! Before: ${items.length}, After: ${cleanedItems.length}`);
        }

        if (moviesAfter !== moviesBefore || tvAfter !== tvBefore) {
            throw new Error(`ABORT: Movie/TV counts changed!`);
        }

        // Step 4: Save if changes were made
        if (cleanedCount > 0) {
            console.log('\n📤 Saving to Contentful...');
            entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] = cleanedItems;
            const updated = await entry.update();
            await updated.publish();
            console.log('   ✅ Published!');
        } else {
            console.log('\n✓ No bloated entries found. Nothing to clean.');
        }

        console.log('\n' + '='.repeat(60));
        console.log('  COMPLETE - All data verified');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('   No changes were saved.');
    }
}

cleanNewEntries();
