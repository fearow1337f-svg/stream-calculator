// ===== НАСТРОЙКИ =====
// Рабочий API-ключ от kinopoiskapiunofficial.tech (из кода друга)
const API_KEY = '3c6501fb-0e64-4d38-9df9-18509d27395e';
// Базовый URL API
const BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';

const STREAMER_NICKNAME = 'Dy2phoria';
const BASE_PRICE = 500;
const LONG_MOVIE_SURCHARGE = 20;

// ===== ЭЛЕМЕНТЫ СТРАНИЦЫ =====
const searchInput = document.getElementById('movieSearch');
const searchBtn = document.getElementById('searchBtn');
const movieCard = document.getElementById('movieCard');
const calculatorBlock = document.getElementById('calculatorBlock');
const errorMessage = document.getElementById('errorMessage');

const moviePoster = document.getElementById('moviePoster');
const movieTitle = document.getElementById('movieTitle');
const movieYear = document.getElementById('movieYear');
const movieDuration = document.getElementById('movieDuration');
const movieCountry = document.getElementById('movieCountry');
const movieImdb = document.getElementById('movieImdb');
const movieImdbLink = document.getElementById('movieImdbLink');
const movieKpLink = document.getElementById('movieKpLink');
const movieOverview = document.getElementById('movieOverview');

const calcRating = document.getElementById('calcRating');
const calcDurationMins = document.getElementById('calcDurationMins');
const ratingAdjustment = document.getElementById('ratingAdjustment');
const durationAdjustment = document.getElementById('durationAdjustment');
const totalPrice = document.getElementById('totalPrice');
const priorityCheckbox = document.getElementById('priorityCheckbox');
const donateText = document.getElementById('donateText');
const copyBtn = document.getElementById('copyBtn');

let currentMovie = null;

// Форматирование длительности (из минут в "Xч Yм")
function formatDuration(minutes) {
    if (!minutes) return '? мин';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}ч ${mins}м`;
    return `${mins} мин`;
}

// Форматирование денег (разделители тысяч)
function formatMoney(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Расчёт цены
function calculatePrice() {
    if (!currentMovie) return;
    
    let price = BASE_PRICE;
    const duration = currentMovie.filmLength || 0;
    let durationExtra = 0;
    
    if (duration > 120) {
        durationExtra = LONG_MOVIE_SURCHARGE;
        price += durationExtra;
    }
    
    if (priorityCheckbox.checked) {
        price = price * 2;
    }
    
    ratingAdjustment.textContent = `+0 ₽`;
    durationAdjustment.textContent = `+${durationExtra} ₽`;
    totalPrice.textContent = `${formatMoney(price)} ₽`;
    
    const movieName = currentMovie.nameRu || currentMovie.nameOriginal || 'Фильм';
    donateText.value = `${movieName} ${priorityCheckbox.checked ? '(ВНЕ ОЧЕРЕДИ)' : ''}`;
}

// Поиск фильма
async function searchMovie(query) {
    if (!query || query.length < 2) {
        showError('Введи хотя бы 2 буквы');
        return;
    }
    
    searchBtn.textContent = '⏳';
    searchBtn.disabled = true;
    hideError();
    hideMovieCard();
    
    try {
        const url = new URL(BASE_URL + '/films');
        url.searchParams.append('keyword', query);
        url.searchParams.append('page', '1');
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-API-KEY': API_KEY,
                'accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            // Берём первый фильм и получаем детали
            const film = data.items[0];
            await enrichMovieData(film);
            displayMovie(film);
            hideError();
        } else {
            showError('Фильм не найден. Попробуй другое название.');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError(`❌ ${error.message}`);
    } finally {
        searchBtn.textContent = 'НАЙТИ';
        searchBtn.disabled = false;
    }
}

// Получение детальной информации о фильме (длительность, страны)
async function enrichMovieData(film) {
    try {
        const url = new URL(BASE_URL + `/films/${film.kinopoiskId}`);
        const response = await fetch(url.toString(), {
            headers: {
                'X-API-KEY': API_KEY,
                'accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const details = await response.json();
            film.filmLength = details.filmLength;
            film.countries = details.countries;
            film.description = details.description;
            film.slogan = details.slogan;
        }
    } catch (error) {
        console.warn('Не удалось загрузить детали фильма:', error);
        film.filmLength = film.filmLength || 0;
    }
}

// Отображение фильма
function displayMovie(film) {
    currentMovie = film;
    
    // Постер
    if (film.posterUrl || film.posterUrlPreview) {
        moviePoster.src = film.posterUrl || film.posterUrlPreview;
    } else {
        moviePoster.src = 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=Нет+постера';
    }
    
    // Название
    movieTitle.textContent = film.nameRu || film.nameOriginal || 'Без названия';
    
    // Год
    movieYear.textContent = film.year || '????';
    
    // Длительность
    const duration = film.filmLength || 0;
    movieDuration.textContent = formatDuration(duration);
    calcDurationMins.textContent = duration;
    
    // Страна
    const country = film.countries?.[0]?.country || '—';
    movieCountry.textContent = country;
    
    // Рейтинг
    const rating = film.ratingKinopoisk?.toFixed(1) || '0.0';
    movieImdb.textContent = rating;
    calcRating.textContent = rating;
    
    // Ссылки
    movieImdbLink.href = `https://www.imdb.com/find?q=${encodeURIComponent(film.nameRu || film.nameOriginal || '')}`;
    movieKpLink.href = `https://www.kinopoisk.ru/film/${film.kinopoiskId}/`;
    
    // Описание
    movieOverview.textContent = film.description || film.slogan || 'Описание отсутствует.';
    
    // Показываем карточку и калькулятор
    movieCard.classList.remove('hidden');
    calculatorBlock.classList.remove('hidden');
    
    // Считаем цену
    calculatePrice();
}

function hideMovieCard() {
    movieCard.classList.add('hidden');
    calculatorBlock.classList.add('hidden');
}

function showError(text) {
    errorMessage.textContent = text.startsWith('❌') ? text : `❌ ${text}`;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// Копирование текста доната
function copyDonateText() {
    donateText.select();
    donateText.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Скопировано!';
        setTimeout(() => copyBtn.textContent = originalText, 1500);
    } catch (err) {
        alert('Не удалось скопировать. Скопируй вручную.');
    }
}

// Обработчики событий
searchBtn.addEventListener('click', () => searchMovie(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMovie(searchInput.value.trim());
});
priorityCheckbox.addEventListener('change', calculatePrice);
copyBtn.addEventListener('click', copyDonateText);

console.log('🎬 Калькулятор загружен! API: kinopoiskapiunofficial.tech');