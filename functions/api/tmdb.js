export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // Убираем /api/tmdb из пути
    let path = url.pathname.replace('/api/tmdb', '');
    const tmdbUrl = `https://api.themoviedb.org/3${path}${url.search}`;
    
    const headers = new Headers();
    headers.set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0ZmU4NGNlMTA4NDJiZDgzM2I0ZGQzMDZmMzdmYmU1ZSIsIm5iZiI6MTc3NjYyODI1Mi42MDYwMDAyLCJzdWIiOiI2OWU1MzIxYzNjMmM4YTliZjIwNjNlZTkiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.JiNDeL08E6u8qEo_NM2hsJqkdA5_OB43ABGn0xUgjnk');
    headers.set('Content-Type', 'application/json');
    
    try {
        const response = await fetch(tmdbUrl, {
            method: request.method,
            headers: headers
        });
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
