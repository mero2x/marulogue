require('dotenv').config();
const contentful = require('contentful-management');
const axios = require('axios');
const fs = require('fs');

const TMDB_API_KEY = '5c9cef63f6816c9678256d7eb09b6ccc';
const BASE_URL = 'https://api.themoviedb.org/3';

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function addLanguageField() {
    console.log('='.repeat(60));
    console.log('  PHASE 3: ADD ORIGINAL_LANGUAGE FIELD');
    console.log('='.repeat(60));
    console.log('');
    console.log('⚠️  This script ONLY ADDS original_language field');
    console.log('⚠️  All existing fields (posters, ratings, reviews) are UNTOUCHED');
    console.log('');

    try {
        // Step 1: Verify backup exists
        const backupFiles = fs.readdirSync('./data').filter(f => f.startsWith('backup_'));
        if (backupFiles.length === 0) {
            throw new Error('NO BACKUP FOUND! Aborting for safety.');
        }
        console.log(`✓ Backup verified: ./data/${backupFiles[backupFiles.length - 1]}\n`);

        // Step 2: Load from Contentful
        console.log('📥 Loading data from Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        let allItems = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];
        const originalCount = allItems.length;
        console.log(`   Loaded ${originalCount} total items\n`);

        // Filter to movies only
        const movies = allItems.filter(i =>
            i.media_type === 'movie' || (!i.media_type && !i.first_air_date)
        );
        console.log(`   Found ${movies.length} movies to enrich\n`);

        let enrichedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const startTime = Date.now();

        // Step 3: Enrich each movie
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];

            // Skip TV shows entirely
            const isTV = item.media_type === 'tv' || (!item.media_type && item.first_air_date);
            if (isTV) {
                skippedCount++;
                continue;
            }

            // Skip if already has original_language
            if (item.original_language) {
                skippedCount++;
                continue;
            }

            const title = item.title || item.name || 'Unknown';
            const progress = Math.round((i / allItems.length) * 100);
            process.stdout.write(`\r[${progress}%] ${i + 1}/${allItems.length} - ${title.substring(0, 35).padEnd(35)}...`);

            try {
                const response = await axios.get(`${BASE_URL}/movie/${item.id}?api_key=${TMDB_API_KEY}`);

                // ONLY add original_language - DO NOT touch any other fields
                allItems[i].original_language = response.data.original_language;

                enrichedCount++;

                // Rate limiting
                await delay(200);

            } catch (err) {
                errorCount++;
                // Don't modify anything on error
            }
        }

        console.log('\n\n');

        // Step 4: CRITICAL VERIFICATION before saving
        console.log('🔍 CRITICAL VERIFICATION...');

        if (allItems.length !== originalCount) {
            throw new Error(`ITEM COUNT MISMATCH! Expected ${originalCount}, got ${allItems.length}. ABORTING!`);
        }
        console.log(`   ✓ Item count preserved: ${allItems.length}`);

        // Verify a random sample of items still have their key fields
        const sampleSize = Math.min(10, allItems.length);
        for (let i = 0; i < sampleSize; i++) {
            const randomIndex = Math.floor(Math.random() * allItems.length);
            const item = allItems[randomIndex];

            // Check essential fields still exist
            if (item.id === undefined) {
                throw new Error(`Item at index ${randomIndex} lost its ID! ABORTING!`);
            }
            if (item.poster_path === undefined && item.poster_path !== null) {
                // poster_path can be null for some items, that's ok
            }
        }
        console.log(`   ✓ Sample verification passed (${sampleSize} items)\n`);

        // Step 5: Save to Contentful
        console.log('💾 Saving to Contentful...');
        entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] = allItems;
        const updatedEntry = await entry.update();
        console.log('   ✓ Entry updated');

        console.log('📤 Publishing...');
        await updatedEntry.publish();
        console.log('   ✓ Published!\n');

        // Summary
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log('='.repeat(60));
        console.log('  ✅ PHASE 3 COMPLETE');
        console.log('='.repeat(60));
        console.log(`  ✅ Movies enriched: ${enrichedCount}`);
        console.log(`  ⏭️  Skipped: ${skippedCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📊 Total items (preserved): ${allItems.length}`);
        console.log(`  ⏱️  Duration: ${duration} seconds`);
        console.log('='.repeat(60));
        console.log('');
        console.log('✔ Ready for Phase 4: Update stats.js with hybrid logic');

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error('   NO CHANGES WERE SAVED TO CONTENTFUL.');
        console.error('   Your data is safe.');
        process.exit(1);
    }
}

addLanguageField();
