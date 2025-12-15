require('dotenv').config();
const contentful = require('contentful-management');
const fs = require('fs');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function createSafeBackup() {
    console.log('='.repeat(60));
    console.log('  PHASE 1: FULL BACKUP');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Step 1: Connect to Contentful
        console.log('🔗 Connecting to Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        // Step 2: Get all data
        const items = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];
        console.log(`📥 Fetched ${items.length} items from Contentful\n`);

        // Step 3: Count by type
        const movies = items.filter(i => i.media_type === 'movie' || (!i.media_type && !i.first_air_date));
        const tvShows = items.filter(i => i.media_type === 'tv' || (!i.media_type && i.first_air_date));

        console.log('📊 Data Summary:');
        console.log(`   Total items: ${items.length}`);
        console.log(`   Movies: ${movies.length}`);
        console.log(`   TV Shows: ${tvShows.length}`);
        console.log('');

        // Step 4: Create timestamped backup
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = `./data/backup_${timestamp}.json`;

        // Ensure data directory exists
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data');
        }

        // Write backup with pretty formatting
        fs.writeFileSync(backupPath, JSON.stringify(items, null, 2));

        // Step 5: Verify backup
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        const backupSize = fs.statSync(backupPath).size;

        if (backupData.length !== items.length) {
            throw new Error(`Backup verification failed! Expected ${items.length} items, got ${backupData.length}`);
        }

        // Step 6: Sample verification - check a few random items have key fields
        const sampleSize = Math.min(5, items.length);
        console.log(`🔍 Verifying ${sampleSize} random items...\n`);

        for (let i = 0; i < sampleSize; i++) {
            const randomIndex = Math.floor(Math.random() * items.length);
            const original = items[randomIndex];
            const backed = backupData[randomIndex];

            // Verify key fields match
            if (original.id !== backed.id ||
                original.title !== backed.title ||
                original.poster_path !== backed.poster_path ||
                original.rating !== backed.rating) {
                throw new Error(`Sample verification failed for item ${original.id}`);
            }

            const title = original.title || original.name;
            console.log(`   ✓ ${title} (ID: ${original.id})`);
        }

        console.log('');
        console.log('='.repeat(60));
        console.log('  ✅ BACKUP COMPLETE');
        console.log('='.repeat(60));
        console.log(`  📁 File: ${backupPath}`);
        console.log(`  📦 Size: ${(backupSize / 1024).toFixed(1)} KB`);
        console.log(`  📊 Items: ${backupData.length}`);
        console.log(`  🎬 Movies: ${movies.length}`);
        console.log(`  📺 TV Shows: ${tvShows.length}`);
        console.log('='.repeat(60));
        console.log('');
        console.log('✔ Backup verified successfully!');
        console.log('✔ Safe to proceed to Phase 2 (Preview)');

    } catch (error) {
        console.error('\n❌ BACKUP FAILED:', error.message);
        console.error('   Please check your connection and try again.');
        process.exit(1);
    }
}

createSafeBackup();
