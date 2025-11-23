export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        // Exchange code for token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.OAUTH_CLIENT_ID,
                client_secret: process.env.OAUTH_CLIENT_SECRET,
                code,
            }),
        });

        const data = await tokenResponse.json();

        if (data.error) {
            return res.status(400).json({ error: data.error_description });
        }

        // Send token back to CMS
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Complete</title>
        </head>
        <body>
          <script>
            (function() {
              function receiveMessage(e) {
                console.log("receiveMessage %o", e);
                window.opener.postMessage(
                  'authorization:github:success:${JSON.stringify(data)}',
                  e.origin
                );
                window.removeEventListener("message", receiveMessage, false);
              }
              window.addEventListener("message", receiveMessage, false);
              console.log("Sending message: %o", "github");
              window.opener.postMessage("authorizing:github", "*");
            })();
          </script>
        </body>
      </html>
    `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
