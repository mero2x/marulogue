const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'content', 'posts');
const outputFile = path.join(__dirname, 'content', 'posts.json');

// Ensure posts directory exists
if (!fs.existsSync(postsDir)) {
    console.log('No posts directory found, creating empty posts.json');
    fs.writeFileSync(outputFile, '[]');
    return;
}

// Read all files in the posts directory
fs.readdir(postsDir, (err, files) => {
    if (err) {
        console.error('Error reading posts directory:', err);
        return;
    }

    const posts = [];

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(postsDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const post = JSON.parse(content);
                // Add ID if not present (use filename)
                if (!post.id) {
                    post.id = path.basename(file, '.json');
                }
                posts.push(post);
            } catch (e) {
                console.error(`Error parsing file ${file}:`, e);
            }
        }
    });

    // Sort posts by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Write the aggregated data to posts.json
    fs.writeFileSync(outputFile, JSON.stringify(posts, null, 2));
    console.log(`Successfully aggregated ${posts.length} posts to ${outputFile}`);
});
