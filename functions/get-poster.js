// Функция для поиска постера по названию фильма
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    // Заголовки для CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Обработка preflight-запроса
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    if (!query || query.length < 2) {
        return new Response(JSON.stringify({ error: 'Введите название фильма' }), {
            status: 400,
            headers
        });
    }

    const API_KEY = '3c6501fb-0e64-4d38-9df9-18509d27395e';
    const BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';

    try {
        // Ищем фильм
        const searchUrl = `${BASE_URL}/films?keyword=${encodeURIComponent(query)}&page=1`;
        const searchResponse = await fetch(searchUrl, {
            headers: { 'X-API-KEY': API_KEY, 'accept': 'application/json' }
        });

        if (!searchResponse.ok) {
            throw new Error(`Ошибка API: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();

        if (!searchData.items || searchData.items.length === 0) {
            return new Response(JSON.stringify({ error: 'Фильм не найден' }), {
                status: 404,
                headers
            });
        }

        const film = searchData.items[0];
        
        // Получаем детальную информацию о фильме (включая постер лучшего качества)
        const detailsUrl = `${BASE_URL}/films/${film.kinopoiskId}`;
        const detailsResponse = await fetch(detailsUrl, {
            headers: { 'X-API-KEY': API_KEY, 'accept': 'application/json' }
        });

        let posterUrl = film.posterUrlPreview || film.posterUrl || '';
        
        if (detailsResponse.ok) {
            const details = await detailsResponse.json();
            posterUrl = details.posterUrl || details.posterUrlPreview || posterUrl;
        }

        return new Response(JSON.stringify({
            title: film.nameRu || film.nameOriginal || query,
            year: film.year,
            poster: posterUrl,
            kinopoiskId: film.kinopoiskId,
            rating: film.ratingKinopoisk || 0
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers
        });
    }
}
