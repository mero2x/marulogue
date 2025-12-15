const contentful = require('contentful');

const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID || '6bzr8twttvj3',
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN || 'MdfnSyUm-p9jlDCG7HCyUuokTZAhyK7UxuXdKA_vXUo'
});

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const type = req.query.type || 'movie'; // 'movie' or 'tv'

        // Fetch the movie list entry from Contentful
        const entry = await client.getEntry('movieList');

        if (!entry || !entry.fields || !entry.fields.contents) {
            return res.status(404).json({ error: 'Movie list not found' });
        }

        let allMovies = entry.fields.contents;

        // Filter by media type
        const filteredMovies = allMovies.filter(item => {
            const itemType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            return itemType === type;
        });

        // Calculate stats
        const totalWatched = filteredMovies.length;

        // Count unique countries and directors
        const countries = new Set();
        const directors = new Set();
        const countryCount = {};
        const directorCount = {};

        filteredMovies.forEach(item => {
            // HYBRID COUNTRY COUNTING:
            // - For English films: use production_countries[0] (since en could be US, UK, IE, AU, etc.)
            // - For non-English films: use original_language (more accurate for origin)
            // - For TV shows: use origin_country

            let country = null;

            // Language code to country mapping
            const languageToCountry = {
                'ja': 'JP', 'ko': 'KR', 'zh': 'CN', 'fr': 'FR', 'de': 'DE',
                'es': 'ES', 'it': 'IT', 'pt': 'BR', 'hi': 'IN', 'ru': 'RU',
                'th': 'TH', 'id': 'ID', 'vi': 'VN', 'tl': 'PH', 'sv': 'SE',
                'da': 'DK', 'no': 'NO', 'fi': 'FI', 'nl': 'NL', 'pl': 'PL',
                'tr': 'TR', 'ar': 'SA', 'he': 'IL', 'cs': 'CZ', 'hu': 'HU',
                'ro': 'RO', 'el': 'GR', 'uk': 'UA', 'ms': 'MY', 'ta': 'IN',
                'te': 'IN', 'bn': 'BD', 'ml': 'IN', 'cn': 'CN'
            };

            const isMovie = item.media_type === 'movie' || (!item.media_type && !item.first_air_date);

            if (isMovie) {
                // For movies: check original_language
                const lang = item.original_language;

                // Ambiguous languages that need production_countries to determine country:
                // - 'en' could be US, UK, IE, AU, CA, NZ, etc.
                // - 'zh' could be China (CN), Hong Kong (HK), or Taiwan (TW)
                const ambiguousLanguages = ['en', 'zh'];

                if (lang && !ambiguousLanguages.includes(lang)) {
                    // Non-ambiguous language: use language to determine country
                    country = languageToCountry[lang];
                }

                // If English OR language mapping not found: use first production country
                if (!country && item.production_countries && item.production_countries.length > 0) {
                    const firstCountry = item.production_countries[0];
                    country = typeof firstCountry === 'string' ? firstCountry : (firstCountry.iso_3166_1 || firstCountry.name);
                }
            } else {
                // For TV shows: use origin_country (this was already working correctly)
                if (item.origin_country && item.origin_country.length > 0) {
                    country = item.origin_country[0];
                }
            }

            // Count the country (only once per item now!)
            if (country) {
                countries.add(country);
                countryCount[country] = (countryCount[country] || 0) + 1;
            }

            // Count Directors/Creators
            const name = type === 'movie' ? item.director : (item.created_by ? item.created_by : item.creator);
            if (name && name !== 'Unknown') {
                name.split(',').forEach(d => {
                    const trimmed = d.trim();
                    if (trimmed) {
                        directors.add(trimmed);
                        directorCount[trimmed] = (directorCount[trimmed] || 0) + 1;
                    }
                });
            }
        });

        // Top 10 countries
        const topCountries = Object.entries(countryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        // Top 10 directors/creators
        const topDirectors = Object.entries(directorCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        res.status(200).json({
            totalWatched,
            totalCountries: countries.size,
            totalDirectors: directors.size,
            topCountries,
            topDirectors
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
};
