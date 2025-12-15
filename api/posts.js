const contentful = require('contentful-management');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
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
        // Use Management API to avoid Delivery API rate limits
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        // Fetch all entries of type 'post'
        const response = await environment.getEntries({
            content_type: 'post',
            order: '-sys.createdAt'
        });

        // Map the entries to a simpler format
        const posts = response.items.map(entry => ({
            id: entry.sys.id,
            title: entry.fields.title?.['en-US'] || 'Untitled',
            date: entry.sys.createdAt,
            type: entry.fields.type?.['en-US'] ||
                (entry.fields.images?.['en-US']?.length > 0 ? 'photoset' :
                    (entry.fields.image?.['en-US'] ? 'photo' : 'text')),
            category: entry.fields.category?.['en-US'] || 'Uncategorized',
            body: entry.fields.body?.['en-US'] || '',
            images: entry.fields.images?.['en-US']?.map(img =>
                img.fields?.file?.['en-US']?.url || ''
            ).filter(Boolean) || [],
            image: entry.fields.image?.['en-US']?.fields?.file?.['en-US']?.url || null
        }));

        res.json({ posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ posts: [], error: error.message });
    }
};
