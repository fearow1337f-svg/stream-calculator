// ===== НАСТРОЙКИ =====
const TMDB_BASE_URL = 'https://c7580590.stream-calculator.pages.dev/api/tmdb';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const STREAMER_NICKNAME = 'Dy2phoria';

let BASE_PRICE = 500;
let LONG_MOVIE_SURCHARGE = 20;

// ===== ЗАГРУЗКА НАСТРОЕК ИЗ JSON =====
async function loadPricingSettings() {
    try {
        const response = await fetch('/_data/settings/pricing.json');
        if (!response.ok) throw new Error('Не удалось загрузить настройки');
        const data = await response.json();
        
        BASE_PRICE = data.basePrice || 500;
        LONG_MOVIE_SURCHARGE = data.longMovieSurcharge || 20;
        
        const basePriceDisplay = document.getElementById('basePriceDisplay');
        if (basePriceDisplay) {
            basePriceDisplay.textContent = `${BASE_PRICE} ₽`;
        }
        
        console.log('✅ Настройки цен загружены:', { BASE_PRICE, LONG_MOVIE_SURCHARGE });
    } catch (error) {
        console.warn('⚠️ Используются стандартные цены:', error);
    }
}

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

function formatDuration(minutes) {
    if (!minutes) return '? мин';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}ч ${mins}м`;
    return `${mins} мин`;
}

function formatMoney(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function calculatePrice() {
    if (!currentMovie) return;
    
    let price = BASE_PRICE;
    const duration = currentMovie.runtime || 0;
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
    
    const movieName = currentMovie.title || currentMovie.original_title || 'Фильм';
    donateText.value = `${movieName} ${priorityCheckbox.checked ? '(ВНЕ ОЧЕРЕДИ)' : ''}`;
}

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
        const searchUrl = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&language=ru-RU&page=1`;
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) throw new Error(`Ошибка ${searchResponse.status}`);
        
        const searchData = await searchResponse.json();
        
        if (searchData.results && searchData.results.length > 0) {
            const movie = searchData.results[0];
            
            const detailsUrl = `${TMDB_BASE_URL}/movie/${movie.id}?language=ru-RU`;
            const detailsResponse = await fetch(detailsUrl);
            
            if (detailsResponse.ok) {
                const details = await detailsResponse.json();
                displayMovie(details);
            } else {
                displayMovie(movie);
            }
            
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

function displayMovie(movie) {
    currentMovie = movie;
    
    if (movie.poster_path) {
        moviePoster.src = TMDB_IMAGE_BASE + movie.poster_path;
        moviePoster.style.display = 'block';
    } else {
        moviePoster.style.display = 'none';
    }
    
    movieTitle.textContent = movie.title || movie.original_title || 'Без названия';
    
    const year = movie.release_date ? movie.release_date.split('-')[0] : '????';
    movieYear.textContent = year;
    
    const duration = movie.runtime || 0;
    movieDuration.textContent = formatDuration(duration);
    calcDurationMins.textContent = duration;
    
    const country = movie.production_countries?.[0]?.name || '—';
    movieCountry.textContent = country;
    
    const rating = movie.vote_average?.toFixed(1) || '0.0';
    movieImdb.textContent = rating;
    calcRating.textContent = rating;
    
    movieImdbLink.href = `https://www.imdb.com/title/${movie.imdb_id || ''}`;
    movieKpLink.href = `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(movie.title || movie.original_title || '')}`;
    
    movieOverview.textContent = movie.overview || 'Описание отсутствует.';
    
    movieCard.classList.remove('hidden');
    calculatorBlock.classList.remove('hidden');
    
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

searchBtn.addEventListener('click', () => searchMovie(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMovie(searchInput.value.trim());
});
priorityCheckbox.addEventListener('change', calculatePrice);
copyBtn.addEventListener('click', copyDonateText);

window.addEventListener('DOMContentLoaded', async () => {
    await loadPricingSettings();
    console.log('🎬 Калькулятор загружен! API: TMDB (через Cloudflare Pages Functions)');
});
