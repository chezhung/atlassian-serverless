// Constants
const AUTH_BASE_URL = 'https://auth.atlassian.com';
const DEFAULT_SCOPES = 'read:confluence-content read:confluence-space.summary';

// Helper functions
function createAuthUrl() {
  let urlParams = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.ATLASSIAN_CLIENT_ID,
    scope: DEFAULT_SCOPES,
    redirect_uri: process.env.ATLASSIAN_REDIRECT_URI,
    response_type: 'code',
    prompt: 'consent'
  }).toString();
  return `${AUTH_BASE_URL}/authorize?${urlParams}`;
} // End of createAuthUrl

function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  };
} // End of createResponse

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }

  const { code } = event.queryStringParameters;
  
  if (!code) {
    return createResponse(200, { authUrl: createAuthUrl() });
  }

  try {
    // Exchange code for access token
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ATLASSIAN_CLIENT_ID,
        client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.ATLASSIAN_REDIRECT_URI
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const access_token = data.access_token;
    const confluence_url = `https://api.atlassian.com/ex/confluence/${data.id}/rest/api/v2/`;

    // Instead of returning JSON, redirect to index.html
    return {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': [
          `atlassian_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
          `confluence_url=${confluence_url}; Path=/; HttpOnly; Secure; SameSite=Strict`
        ]
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    return createResponse(500, { error: 'Authentication failed' });
  }
}; 