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

        // Fetch the movie list entry from Contentful (with cache bust)
        const entry = await client.getEntry('movieList', { query: { t: Date.now() } });

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
            // Count Countries
            if (item.production_countries && Array.isArray(item.production_countries)) {
                item.production_countries.forEach(c => {
                    // Handle both object {name: 'US'} and string 'US' formats
                    const name = typeof c === 'string' ? c : (c.name || c.iso_3166_1);
                    if (name) {
                        countries.add(name);
                        countryCount[name] = (countryCount[name] || 0) + 1;
                    }
                });
            } else if (item.origin_country && Array.isArray(item.origin_country)) {
                item.origin_country.forEach(c => {
                    countries.add(c);
                    countryCount[c] = (countryCount[c] || 0) + 1;
                });
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
