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
    console.log('Token response:', JSON.stringify(data, null, 2));

    // Get user info to get the cloud ID
    const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!resourcesResponse.ok) {
      throw new Error(`Failed to get accessible resources: ${resourcesResponse.status}`);
    }

    const resData = (await resourcesResponse.json())[0];
    console.log('Accessible resources data:', JSON.stringify(resData, null, 2));

    return {
      statusCode: 302,
      headers: {
        'Location': '/'
      },
      multiValueHeaders: {
        'Set-Cookie': [
          `atlassian_token=${data.access_token}; Path=/; Secure; SameSite=Lax;`,
          `cloud_id=${resData.id}; Path=/; Secure; SameSite=Lax;`,
          `host_url=${resData.url}; Path=/; Secure; SameSite=Lax;`
        ]
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    return createResponse(500, { error: 'Authentication failed' });
  }
}; 