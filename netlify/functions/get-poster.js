const API_KEY = '3c6501fb-0e64-4d38-9df9-18509d27395e';
const BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';

exports.handler = async (event) => {
    // Разрешаем запросы только с твоего сайта
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Обрабатываем предварительный запрос (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Получаем название фильма из запроса
    const query = event.queryStringParameters?.query;

    if (!query || query.length < 2) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Введи название фильма' })
        };
    }

    try {
        // Ищем фильм
        const searchUrl = new URL(BASE_URL + '/films');
        searchUrl.searchParams.append('keyword', query);
        searchUrl.searchParams.append('page', '1');

        const searchResponse = await fetch(searchUrl.toString(), {
            headers: { 'X-API-KEY': API_KEY, 'accept': 'application/json' }
        });

        if (!searchResponse.ok) {
            throw new Error(`Ошибка ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();

        if (!searchData.items || searchData.items.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Фильм не найден' })
            };
        }

        const film = searchData.items[0];

        // Возвращаем нужные данные
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                title: film.nameRu || film.nameOriginal || 'Без названия',
                year: film.year || '—',
                poster: film.posterUrl || film.posterUrlPreview || '',
                kinopoiskId: film.kinopoiskId,
                rating: film.ratingKinopoisk || 0
            })
        };

    } catch (error) {
        console.error('Ошибка:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Ошибка сервера' })
        };
    }
};
