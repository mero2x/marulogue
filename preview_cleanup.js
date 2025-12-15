require('dotenv').config();
const contentful = require('contentful-management');

// Fields to KEEP (used on the blog)
const KEEP_FIELDS = [
    'id',
    'title',
    'name',
    'poster_path',
    'release_date',
    'first_air_date',
    'media_type',
    'director',
    'creator',
    'production_countries',
    'origin_country',
    'rating',
    'review'
];

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

async function previewCleanup() {
    console.log('='.repeat(60));
    console.log('  CLEANUP PREVIEW (READ-ONLY - NO CHANGES MADE)');
    console.log('='.repeat(60));
    console.log('');

    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        const items = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];
        console.log(`Total items in Contentful: ${items.length}\n`);

        // Calculate current size
        const currentSize = JSON.stringify(items).length;
        console.log(`Current data size: ${(currentSize / 1024).toFixed(1)} KB\n`);

        // Count fields to remove
        const fieldCounts = {};
        items.forEach(item => {
            Object.keys(item).forEach(key => {
                if (REMOVE_FIELDS.includes(key)) {
                    fieldCounts[key] = (fieldCounts[key] || 0) + 1;
                }
            });
        });

        console.log('Fields to be REMOVED:');
        console.log('-'.repeat(40));
        Object.entries(fieldCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([field, count]) => {
                console.log(`  ${field.padEnd(20)} ${count} items`);
            });

        // Calculate new size
        const cleanedItems = items.map(item => {
            const cleaned = {};
            Object.keys(item).forEach(key => {
                if (!REMOVE_FIELDS.includes(key)) {
                    cleaned[key] = item[key];
                }
            });
            return cleaned;
        });

        const newSize = JSON.stringify(cleanedItems).length;
        const savings = currentSize - newSize;
        const savingsPercent = ((savings / currentSize) * 100).toFixed(1);

        console.log('\n' + '='.repeat(60));
        console.log('  ESTIMATED SAVINGS');
        console.log('='.repeat(60));
        console.log(`  Current size:  ${(currentSize / 1024).toFixed(1)} KB`);
        console.log(`  After cleanup: ${(newSize / 1024).toFixed(1)} KB`);
        console.log(`  Savings:       ${(savings / 1024).toFixed(1)} KB (${savingsPercent}%)`);
        console.log('='.repeat(60));

        console.log('\n✓ This was a PREVIEW only. No changes were made.');
        console.log('  Run cleanup_data.js to apply changes.\n');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

previewCleanup();
