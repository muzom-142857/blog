import { createServer } from 'node:http';
import handler from 'serve-handler';

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

function popupScript(payload) {
  return `<script>
    (function() {
      function receive(e) {
        window.opener.postMessage('authorization:github:${payload.success ? 'success' : 'error'}:' + JSON.stringify(${JSON.stringify(payload.data)}), e.origin);
        window.removeEventListener('message', receive);
      }
      window.addEventListener('message', receive);
      window.opener.postMessage('authorizing:github', '*');
    })();
  </script>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ponytail: single hardcoded GitHub OAuth App for one admin user, no session/multi-user auth
  if (url.pathname === '/auth') {
    if (!CLIENT_ID) {
      res.writeHead(500).end('OAUTH_CLIENT_ID not set');
      return;
    }
    const redirectUri = `${url.protocol}//${url.host}/callback`;
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'repo,user');
    res.writeHead(302, { Location: authUrl.toString() }).end();
    return;
  }

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
      });
      const tokenJson = await tokenRes.json();
      if (tokenJson.error) throw new Error(tokenJson.error_description || tokenJson.error);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(popupScript({ success: true, data: { token: tokenJson.access_token, provider: 'github' } }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(popupScript({ success: false, data: { message: err.message } }));
    }
    return;
  }

  return handler(req, res, { public: 'dist', cleanUrls: true, trailingSlash: true });
});

server.listen(PORT, () => console.log(`listening on ${PORT}`));
