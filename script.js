// ===== НАСТРОЙКИ =====
// Рабочий API-ключ от kinopoiskapiunofficial.tech
const API_KEY = '3c6501fb-0e64-4d38-9df9-18509d27395e';
// Базовый URL API Кинопоиска
const BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';
// База постеров TMDB (только для картинок, API не используется)
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const STREAMER_NICKNAME = 'Dy2phoria';

let BASE_PRICE = 500;
let LONG_MOVIE_SURCHARGE = 20;
let SERIES_BASE_PRICE = 200;
let currentType = 'FILM'; // 'FILM' или 'TV_SERIES'

// ===== ЗАГРУЗКА НАСТРОЕК ИЗ JSON =====
async function loadPricingSettings() {
    try {
        const response = await fetch('/_data/settings/pricing.json');
        if (!response.ok) throw new Error('Не удалось загрузить настройки');
        const data = await response.json();
        
        BASE_PRICE = data.basePrice || 500;
        LONG_MOVIE_SURCHARGE = data.longMovieSurcharge || 20;
        SERIES_BASE_PRICE = data.seriesBasePrice || 200;
        
        const basePriceDisplay = document.getElementById('basePriceDisplay');
        if (basePriceDisplay) {
            basePriceDisplay.textContent = `${BASE_PRICE} ₽`;
        }
        
        console.log('✅ Настройки цен загружены:', { BASE_PRICE, LONG_MOVIE_SURCHARGE, SERIES_BASE_PRICE });
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

// Элементы для сериалов
const episodesRow = document.getElementById('episodesRow');
const episodesCount = document.getElementById('episodesCount');

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
    
    const isSeries = currentMovie.type === 'TV_SERIES' || currentMovie.type === 'TV_SHOW' || currentMovie.type === 'MINI_SERIES';
    
    let price = isSeries ? SERIES_BASE_PRICE : BASE_PRICE;
    const duration = currentMovie.filmLength || 0;
    let durationExtra = 0;
    let episodes = 1;
    
    if (!isSeries && duration > 120) {
        durationExtra = LONG_MOVIE_SURCHARGE;
        price += durationExtra;
    }
    
    if (isSeries && episodesCount) {
        episodes = parseInt(episodesCount.value) || 1;
        price = price * episodes;
    }
    
    if (priorityCheckbox.checked) {
        price = price * 2;
    }
    
    ratingAdjustment.textContent = `+0 ₽`;
    durationAdjustment.textContent = isSeries ? '—' : `+${durationExtra} ₽`;
    totalPrice.textContent = `${formatMoney(price)} ₽`;
    
    const movieName = currentMovie.nameRu || currentMovie.nameOriginal || 'Фильм';
    const priorityText = priorityCheckbox.checked ? ' (ВНЕ ОЧЕРЕДИ)' : '';
    const episodesText = isSeries ? ` — ${episodes} серий` : '';
    
    donateText.value = `${movieName}${episodesText}${priorityText}`;
}

// Поиск фильма — теперь показывает список, если результатов больше одного
async function searchMovie(query) {
    if (!query || query.length < 2) {
        showError('Введи хотя бы 2 буквы');
        return;
    }
    
    searchBtn.textContent = '⏳';
    searchBtn.disabled = true;
    hideError();
    hideMovieCard();
    hideMovieList();
    
    try {
        const url = new URL(BASE_URL + '/films');
        url.searchParams.append('keyword', query);
        url.searchParams.append('page', '1');
        url.searchParams.append('type', currentType);
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-API-KEY': API_KEY,
                'accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            if (data.items.length === 1) {
                const film = data.items[0];
                await enrichMovieData(film);
                displayMovie(film);
                hideMovieList();
            } else {
                renderMovieList(data.items);
            }
            hideError();
        } else {
            showError('Ничего не найдено. Попробуй другое название.');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showError(`❌ ${error.message}`);
    } finally {
        searchBtn.textContent = 'НАЙТИ';
        searchBtn.disabled = false;
    }
}

// Отображение списка фильмов
function renderMovieList(movies) {
    const oldList = document.getElementById('movieList');
    if (oldList) oldList.remove();
    
    const listContainer = document.createElement('div');
    listContainer.id = 'movieList';
    listContainer.className = 'movie-list';
    
    const title = document.createElement('h3');
    title.className = 'movie-list-title';
    title.textContent = `Найдено ${movies.length}:`;
    listContainer.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'movie-list-grid';
    
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-list-card';
        
        const year = movie.year || '????';
        const poster = movie.posterUrlPreview || movie.posterUrl || '';
        const type = movie.type === 'TV_SERIES' ? '📺' : '🎬';
        
        card.innerHTML = `
            ${poster ? `<img src="${poster}" alt="${movie.nameRu}" class="movie-list-poster">` : ''}
            <div class="movie-list-info">
                <div class="movie-list-name">${type} ${movie.nameRu || movie.nameOriginal || 'Без названия'}</div>
                <div class="movie-list-year">${year}</div>
            </div>
        `;
        
        card.addEventListener('click', async () => {
            searchBtn.textContent = '⏳';
            searchBtn.disabled = true;
            
            await enrichMovieData(movie);
            displayMovie(movie);
            hideMovieList();
            
            searchBtn.textContent = 'НАЙТИ';
            searchBtn.disabled = false;
        });
        
        grid.appendChild(card);
    });
    
    listContainer.appendChild(grid);
    
    const searchSection = document.querySelector('.search-section');
    searchSection.parentNode.insertBefore(listContainer, searchSection.nextSibling);
}

function hideMovieList() {
    const list = document.getElementById('movieList');
    if (list) list.remove();
}

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

function displayMovie(film) {
    currentMovie = film;
    
    const isSeries = film.type === 'TV_SERIES' || film.type === 'TV_SHOW' || film.type === 'MINI_SERIES';
    
    // Показываем или скрываем поле количества серий
    if (episodesRow) {
        episodesRow.classList.toggle('hidden', !isSeries);
        if (isSeries && episodesCount) episodesCount.value = 1;
    }
    
    // Меняем заголовок калькулятора
    const calculatorTitle = document.querySelector('.calculator-title');
    if (calculatorTitle) {
        calculatorTitle.textContent = isSeries ? '🧮 КАЛЬКУЛЯЦИЯ: Сериал' : '🧮 КАЛЬКУЛЯЦИЯ: Фильм';
    }
    
    // Меняем текст базовой стоимости и её значение
    const baseLabel = document.querySelector('.calc-row:first-child .calc-label');
    const baseValue = document.getElementById('basePriceDisplay');
    
    if (baseLabel) {
        baseLabel.textContent = isSeries ? 'Базовая стоимость серии' : 'Базовая стоимость';
    }
    if (baseValue) {
        baseValue.textContent = `${isSeries ? SERIES_BASE_PRICE : BASE_PRICE} ₽`;
    }
    
    // Постер
    if (film.kinopoiskId) {
        fetch(`https://kinopoiskapiunofficial.tech/api/v2.2/films/${film.kinopoiskId}/external_sources`, {
            headers: { 'X-API-KEY': API_KEY }
        })
        .then(res => res.json())
        .then(data => {
            if (data.tmdbId) {
                fetch(`https://api.themoviedb.org/3/movie/${data.tmdbId}?api_key=4fe84ce10842bd833b4dd306f37fbe5e&language=ru`)
                    .then(res => res.json())
                    .then(tmdbData => {
                        if (tmdbData.poster_path) {
                            moviePoster.src = TMDB_IMAGE_BASE + tmdbData.poster_path;
                            moviePoster.style.display = 'block';
                        } else {
                            throw new Error('No poster');
                        }
                    })
                    .catch(() => {
                        moviePoster.src = film.posterUrl || film.posterUrlPreview || '';
                        moviePoster.style.display = moviePoster.src ? 'block' : 'none';
                    });
            } else {
                throw new Error('No TMDB ID');
            }
        })
        .catch(() => {
            moviePoster.src = film.posterUrl || film.posterUrlPreview || '';
            moviePoster.style.display = moviePoster.src ? 'block' : 'none';
        });
    } else {
        moviePoster.src = film.posterUrl || film.posterUrlPreview || '';
        moviePoster.style.display = moviePoster.src ? 'block' : 'none';
    }
    
    movieTitle.textContent = film.nameRu || film.nameOriginal || 'Без названия';
    movieYear.textContent = film.year || '????';
    
    const duration = film.filmLength || 0;
    movieDuration.textContent = isSeries ? '—' : formatDuration(duration);
    calcDurationMins.textContent = isSeries ? 0 : duration;
    
    movieCountry.textContent = film.countries?.[0]?.country || '—';
    
    const rating = film.ratingKinopoisk?.toFixed(1) || '0.0';
    movieImdb.textContent = rating;
    calcRating.textContent = rating;
    
    movieImdbLink.href = `https://www.imdb.com/find?q=${encodeURIComponent(film.nameRu || film.nameOriginal || '')}`;
    movieKpLink.href = `https://www.kinopoisk.ru/film/${film.kinopoiskId}/`;
    
    movieOverview.textContent = film.description || film.slogan || 'Описание отсутствует.';
    
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

// Обработчики событий
searchBtn.addEventListener('click', () => searchMovie(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMovie(searchInput.value.trim());
});
priorityCheckbox.addEventListener('change', calculatePrice);
copyBtn.addEventListener('click', copyDonateText);

if (episodesCount) {
    episodesCount.addEventListener('input', calculatePrice);
    episodesCount.addEventListener('change', calculatePrice);
}

// Переключатель типа контента
const filmTypeBtn = document.getElementById('filmTypeBtn');
const seriesTypeBtn = document.getElementById('seriesTypeBtn');

if (filmTypeBtn && seriesTypeBtn) {
    filmTypeBtn.addEventListener('click', () => {
        filmTypeBtn.classList.add('active');
        seriesTypeBtn.classList.remove('active');
        currentType = 'FILM';
        document.querySelector('.section-subtitle').textContent = '# ЗАКАЗ ФИЛЬМОВ';
        searchInput.placeholder = 'Поиск фильмов...';
    });
    
    seriesTypeBtn.addEventListener('click', () => {
        seriesTypeBtn.classList.add('active');
        filmTypeBtn.classList.remove('active');
        currentType = 'TV_SERIES';
        document.querySelector('.section-subtitle').textContent = '# ЗАКАЗ СЕРИАЛОВ';
        searchInput.placeholder = 'Поиск сериалов...';
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadPricingSettings();
    console.log('🎬 Калькулятор загружен! API: Кинопоиск + постеры TMDB');
});
