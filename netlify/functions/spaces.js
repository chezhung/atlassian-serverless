exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = event.headers.cookie?.split(';')
    .find(c => c.trim().startsWith('atlassian_token='))
    ?.split('=')[1];

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const url = new URL('https://kkvideo.atlassian.net/wiki/api/v2/spaces');
    Object.entries(event.queryStringParameters || {}).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
      body: JSON.stringify({ error: error.message })
    };
  }
}; 