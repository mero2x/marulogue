const contentful = require('contentful-management');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const client = contentful.createClient({
            accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
        });

        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        const entry = await environment.getEntry(process.env.CONTENTFUL_ENTRY_ID || 'movieList');

        const allItems = entry.fields[process.env.CONTENTFUL_FIELD_ID || 'contents']['en-US'] || [];

        res.status(200).json({
            movies: allItems,
            total: allItems.length
        });

    } catch (error) {
        console.error('Error fetching fresh data:', error);
        res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    }
};
