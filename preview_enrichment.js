require('dotenv').config();
const contentful = require('contentful-management');
const axios = require('axios');
const fs = require('fs');

const TMDB_API_KEY = '5c9cef63f6816c9678256d7eb09b6ccc';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

// Language code to country name mapping
const LANGUAGE_TO_COUNTRY = {
    'ja': 'Japan',
    'ko': 'South Korea',
    'zh': 'China',
    'cn': 'China',
    'en': 'USA',
    'fr': 'France',
    'de': 'Germany',
    'es': 'Spain',
    'it': 'Italy',
    'pt': 'Brazil',
    'hi': 'India',
    'ru': 'Russia',
    'th': 'Thailand',
    'id': 'Indonesia',
    'vi': 'Vietnam',
    'tl': 'Philippines',
    'sv': 'Sweden',
    'da': 'Denmark',
    'no': 'Norway',
    'fi': 'Finland',
    'nl': 'Netherlands',
    'pl': 'Poland',
    'tr': 'Turkey',
    'ar': 'Saudi Arabia',
    'he': 'Israel',
    'cs': 'Czech Republic',
    'hu': 'Hungary',
    'ro': 'Romania',
    'el': 'Greece'
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOriginalLanguage(movieId) {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`);
        return response.data.original_language;
    } catch (e) {
        if (e.response && e.response.status === 429) {
            // Rate limited, wait and retry
            await sleep(1000);
            return fetchOriginalLanguage(movieId);
        }
        return null;
    }
}

async function previewEnrichment() {
    console.log('='.repeat(60));
    console.log('  PHASE 2: PREVIEW ENRICHMENT (DRY RUN)');
    console.log('='.repeat(60));
    console.log('');
    console.log('⚠️  This is a PREVIEW ONLY - no data will be modified');
    console.log('');

    try {
        // Step 1: Connect and get data
        console.log('🔗 Connecting to Contentful...');
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID);

        const items = entry.fields[process.env.CONTENTFUL_FIELD_ID]['en-US'] || [];

        // Filter to movies only (TV shows already have origin_country)
        const movies = items.filter(i =>
            i.media_type === 'movie' || (!i.media_type && !i.first_air_date)
        );

        console.log(`📥 Found ${movies.length} movies to analyze\n`);

        // Step 2: Check how many already have original_language
        const alreadyHave = movies.filter(m => m.original_language);
        const needEnrichment = movies.filter(m => !m.original_language);

        console.log('📊 Current State:');
        console.log(`   Already have original_language: ${alreadyHave.length}`);
        console.log(`   Need enrichment: ${needEnrichment.length}`);
        console.log('');

        // Step 3: Sample fetch from TMDB (just 20 movies for preview)
        const sampleSize = Math.min(20, needEnrichment.length);
        console.log(`🔍 Sampling ${sampleSize} movies from TMDB...\n`);

        const languageDistribution = {};
        const sampleResults = [];

        for (let i = 0; i < sampleSize; i++) {
            const movie = needEnrichment[i];
            const lang = await fetchOriginalLanguage(movie.id);

            if (lang) {
                languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
                sampleResults.push({
                    title: movie.title,
                    id: movie.id,
                    original_language: lang,
                    mapped_country: LANGUAGE_TO_COUNTRY[lang] || lang.toUpperCase()
                });
            }

            // Rate limiting
            await sleep(100);

            // Progress indicator
            process.stdout.write(`   Processing ${i + 1}/${sampleSize}...\r`);
        }
        console.log('');

        // Step 4: Show sample results
        console.log('\n📋 Sample Preview (what would be added):');
        console.log('-'.repeat(60));

        sampleResults.slice(0, 10).forEach(r => {
            console.log(`   ${r.title}`);
            console.log(`      → original_language: "${r.original_language}" (${r.mapped_country})`);
        });

        // Step 5: Show language distribution from sample
        console.log('\n📊 Language Distribution (from sample):');
        console.log('-'.repeat(60));

        const sortedLangs = Object.entries(languageDistribution)
            .sort((a, b) => b[1] - a[1]);

        sortedLangs.forEach(([lang, count]) => {
            const country = LANGUAGE_TO_COUNTRY[lang] || lang.toUpperCase();
            console.log(`   ${lang} (${country}): ${count} movies`);
        });

        // Step 6: Summary
        console.log('');
        console.log('='.repeat(60));
        console.log('  📋 PREVIEW SUMMARY');
        console.log('='.repeat(60));
        console.log(`  Total movies: ${movies.length}`);
        console.log(`  Need enrichment: ${needEnrichment.length}`);
        console.log(`  Sample success rate: ${sampleResults.length}/${sampleSize}`);
        console.log('');
        console.log('  What will happen in Phase 3:');
        console.log('  • Fetch original_language for all movies from TMDB');
        console.log('  • ADD this field to each movie (no other changes)');
        console.log('  • Save to Contentful');
        console.log('');
        console.log('  ⚠️  NO DATA WAS MODIFIED - this was a preview only');
        console.log('='.repeat(60));

        // Save preview report
        const reportPath = './data/enrichment_preview.json';
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            totalMovies: movies.length,
            needEnrichment: needEnrichment.length,
            sampleSize,
            sampleResults,
            languageDistribution
        }, null, 2));
        console.log(`\n📄 Full preview saved to: ${reportPath}`);

    } catch (error) {
        console.error('\n❌ PREVIEW FAILED:', error.message);
        process.exit(1);
    }
}

previewEnrichment();
