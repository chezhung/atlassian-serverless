
exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse cookies from the request headers
  const cookies = event.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {}) || {};

  const token   = cookies['atlassian_token'];
  const cloudId = cookies['cloud_id'];
  const hostUrl = cookies['host_url'];

  //const confluenceApiUrl = `${hostUrl}/rest/api/v2`;
  const confluenceApiUrl = `https://api.atlassian.com/ex/confluence/${cloudId}/rest/api/v2`;
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // Use the correct API endpoint for Confluence spaces
    const url = new URL(`${confluenceApiUrl}/spaces`);
    
    // Add query parameters if they exist
    if (event.queryStringParameters) {
      Object.entries(event.queryStringParameters).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log('Making request to:', url.toString());

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        response: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, URL: ${url.toString()}, message: ${errorText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Spaces error:', error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({ 
        error: error.message,
        details: error.stack
      })
    };
  }
}; 