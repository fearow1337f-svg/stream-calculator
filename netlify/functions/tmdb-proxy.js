// Netlify Function для проксирования запросов к TMDB API
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0ZmU4NGNlMTA4NDJiZDgzM2I0ZGQzMDZmMzdmYmU1ZSIsIm5iZiI6MTc3NjYyODI1Mi42MDYwMDAyLCJzdWIiOiI2OWU1MzIxYzNjMmM4YTliZjIwNjNlZTkiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.JiNDeL08E6u8qEo_NM2hsJqkdA5_OB43ABGn0xUgjnk';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    const path = event.path.replace('/.netlify/functions/tmdb-proxy', '');
    const tmdbUrl = `${TMDB_BASE_URL}${path}`;

    try {
        const response = await fetch(tmdbUrl, {
            method: event.httpMethod,
            headers: {
                'Authorization': `Bearer ${TMDB_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        return {
            statusCode: response.status,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
