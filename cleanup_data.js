require('dotenv').config();
const contentful = require('contentful-management');
const fs = require('fs');

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

async function cleanup() {
    console.log('='.repeat(60));
    console.log('  DATA CLEANUP');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Step 1: Connect and get current data
        console.log('📥 Connecting to Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        const items = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];
        console.log(`   Found ${items.length} items\n`);

        // Step 2: Create backup
        console.log('💾 Creating backup...');
        const backupPath = './data/backup_before_cleanup.json';
        fs.writeFileSync(backupPath, JSON.stringify(items, null, 2));
        console.log(`   Saved to ${backupPath}\n`);

        // Count before
        const movies = items.filter(i => i.media_type === 'movie' || (!i.media_type && !i.first_air_date));
        const tv = items.filter(i => i.media_type === 'tv' || (!i.media_type && i.first_air_date));
        console.log(`   Movies: ${movies.length}`);
        console.log(`   TV Shows: ${tv.length}\n`);

        // Step 3: Clean the data
        console.log('🧹 Cleaning data...');
        let fieldsRemoved = 0;

        const cleanedItems = items.map(item => {
            const cleaned = {};
            Object.keys(item).forEach(key => {
                if (REMOVE_FIELDS.includes(key)) {
                    fieldsRemoved++;
                } else {
                    cleaned[key] = item[key];
                }
            });
            return cleaned;
        });

        console.log(`   Removed ${fieldsRemoved} field instances\n`);

        // Step 4: Verify counts match
        const cleanedMovies = cleanedItems.filter(i => i.media_type === 'movie' || (!i.media_type && !i.first_air_date));
        const cleanedTV = cleanedItems.filter(i => i.media_type === 'tv' || (!i.media_type && i.first_air_date));

        if (cleanedItems.length !== items.length) {
            throw new Error(`Item count mismatch! Before: ${items.length}, After: ${cleanedItems.length}`);
        }

        console.log('✓ Verification passed:');
        console.log(`   Items: ${items.length} → ${cleanedItems.length}`);
        console.log(`   Movies: ${movies.length} → ${cleanedMovies.length}`);
        console.log(`   TV Shows: ${tv.length} → ${cleanedTV.length}\n`);

        // Step 5: Save to Contentful
        console.log('📤 Saving to Contentful...');
        entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] = cleanedItems;
        const updatedEntry = await entry.update();
        console.log('   ✓ Entry updated');

        console.log('📤 Publishing...');
        await updatedEntry.publish();
        console.log('   ✓ Published!\n');

        // Calculate savings
        const beforeSize = JSON.stringify(items).length;
        const afterSize = JSON.stringify(cleanedItems).length;
        const savings = beforeSize - afterSize;

        console.log('='.repeat(60));
        console.log('  CLEANUP COMPLETE');
        console.log('='.repeat(60));
        console.log(`  ✅ Items cleaned: ${cleanedItems.length}`);
        console.log(`  ✅ Movies: ${cleanedMovies.length}`);
        console.log(`  ✅ TV Shows: ${cleanedTV.length}`);
        console.log(`  💾 Size reduced: ${(beforeSize / 1024).toFixed(1)} KB → ${(afterSize / 1024).toFixed(1)} KB`);
        console.log(`  📉 Saved: ${(savings / 1024).toFixed(1)} KB (${((savings / beforeSize) * 100).toFixed(1)}%)`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('   No changes were made to Contentful.');
    }
}

cleanup();
