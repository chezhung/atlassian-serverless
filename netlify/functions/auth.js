exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { code } = event.queryStringParameters;
  
  if (!code) {
    // Return auth URL if no code is provided
    const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${process.env.ATLASSIAN_CLIENT_ID}&scope=read%3Aconfluence-content%20read%3Aconfluence-space.summary&redirect_uri=${process.env.ATLASSIAN_REDIRECT_URI}&response_type=code&prompt=consent`;
    return {
      statusCode: 200,
      body: JSON.stringify({ authUrl })
    };
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
    const { access_token } = data;

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': `atlassian_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
}; 