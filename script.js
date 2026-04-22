// ===== НАСТРОЙКИ API =====
const KP_API_KEY = '3c6501fb-0e64-4d38-9df9-18509d27395e';
const KP_BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';
const RAWG_API_KEY = '7211c3c360a74c3180735f9b8ded07bc';
const RAWG_BASE_URL = 'https://api.rawg.io/api';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const STREAMER_NICKNAME = 'Dy2phoria';

// ===== НАСТРОЙКИ ЦЕН =====
let BASE_PRICE = 500;
let LONG_MOVIE_SURCHARGE = 20;
let SERIES_BASE_PRICE = 200;
let GAME_BASE_PRICE = 600;
let GAME_HOUR_SURCHARGE = 50;

let currentType = 'FILM';

// ===== ЗАГРУЗКА НАСТРОЕК =====
async function loadPricingSettings() {
    try {
        const response = await fetch('/_data/settings/pricing.json');
        if (!response.ok) throw new Error('Не удалось загрузить настройки');
        const data = await response.json();
        
        BASE_PRICE = data.basePrice || 500;
        LONG_MOVIE_SURCHARGE = data.longMovieSurcharge || 20;
        SERIES_BASE_PRICE = data.seriesBasePrice || 200;
        GAME_BASE_PRICE = data.gameBasePrice || 600;
        GAME_HOUR_SURCHARGE = data.gameHourSurcharge || 50;
        
        updateBasePriceDisplay();
        console.log('✅ Настройки цен загружены');
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
const errorText = document.getElementById('errorText');

const moviePoster = document.getElementById('moviePoster');
const movieTitle = document.getElementById('movieTitle');
const movieYear = document.getElementById('movieYear');
const movieDuration = document.getElementById('movieDuration');
const movieCountry = document.getElementById('movieCountry');
const movieImdb = document.getElementById('movieImdb');
const movieImdbLink = document.getElementById('movieImdbLink');
const movieKpLink = document.getElementById('movieKpLink');
const movieWikiLink = document.getElementById('movieWikiLink');
const movieOverview = document.getElementById('movieOverview');

const calcRating = document.getElementById('calcRating');
const calcDurationMins = document.getElementById('calcDurationMins');
const durationLabel = document.getElementById('durationLabel');
const ratingAdjustment = document.getElementById('ratingAdjustment');
const durationAdjustment = document.getElementById('durationAdjustment');
const totalPrice = document.getElementById('totalPrice');
const priorityCheckbox = document.getElementById('priorityCheckbox');
const donateText = document.getElementById('donateText');
const copyBtn = document.getElementById('copyBtn');

const episodesRow = document.getElementById('episodesRow');
const episodesCount = document.getElementById('episodesCount');

let currentItem = null;

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function formatDuration(minutes) {
    if (!minutes) return '? мин';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}ч ${mins}м`;
    return `${mins} мин`;
}

function formatHours(hours) {
    if (!hours) return '? ч';
    return `${hours} ч`;
}

function formatMoney(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function updateBasePriceDisplay() {
    const baseValue = document.getElementById('basePriceDisplay');
    if (!baseValue) return;
    if (currentType === 'FILM') baseValue.textContent = `${BASE_PRICE} ₽`;
    else if (currentType === 'TV_SERIES') baseValue.textContent = `${SERIES_BASE_PRICE} ₽`;
    else if (currentType === 'GAME') baseValue.textContent = `${GAME_BASE_PRICE} ₽`;
}

// ===== РАСЧЁТ ЦЕНЫ =====
function calculatePrice() {
    if (!currentItem) return;
    
    let price = 0;
    let durationExtra = 0;
    let episodes = 1;
    
    if (currentType === 'FILM') {
        price = BASE_PRICE;
        const duration = currentItem.filmLength || 0;
        if (duration > 120) {
            durationExtra = LONG_MOVIE_SURCHARGE;
            price += durationExtra;
        }
        durationAdjustment.textContent = `+${durationExtra} ₽`;
    } else if (currentType === 'TV_SERIES') {
        price = SERIES_BASE_PRICE;
        episodes = parseInt(episodesCount?.value) || 1;
        price = price * episodes;
        durationAdjustment.textContent = '—';
    } else if (currentType === 'GAME') {
        price = GAME_BASE_PRICE;
        const playtime = currentItem.playtime || 0;
        if (playtime > 0) {
            durationExtra = playtime * GAME_HOUR_SURCHARGE;
            price += durationExtra;
        }
        durationAdjustment.textContent = `+${durationExtra} ₽`;
    }
    
    if (priorityCheckbox.checked) price = price * 2;
    
    ratingAdjustment.textContent = `+0 ₽`;
    totalPrice.textContent = `${formatMoney(price)} ₽`;
    
    const itemName = currentItem.nameRu || currentItem.nameOriginal || currentItem.name || 'Без названия';
    const priorityText = priorityCheckbox.checked ? ' (ВНЕ ОЧЕРЕДИ)' : '';
    let detailsText = '';
    
    if (currentType === 'TV_SERIES') detailsText = ` — ${episodes} серий`;
    else if (currentType === 'GAME') detailsText = ` — ${currentItem.playtime || 0} ч`;
    
    donateText.value = `${itemName}${detailsText}${priorityText}`;
}

// ===== ПОИСК =====
async function search(query) {
    if (!query || query.length < 2) { showError('Введи хотя бы 2 символа'); return; }
    searchBtn.textContent = '⏳'; searchBtn.disabled = true;
    hideError(); hideMovieCard(); hideMovieList();
    try {
        if (currentType === 'FILM' || currentType === 'TV_SERIES') await searchKinopoisk(query);
        else if (currentType === 'GAME') await searchRAWG(query);
    } catch (error) {
        showError(`❌ ${error.message}`);
    } finally {
        searchBtn.textContent = 'НАЙТИ'; searchBtn.disabled = false;
    }
}

async function searchKinopoisk(query) {
    const url = new URL(KP_BASE_URL + '/films');
    url.searchParams.append('keyword', query);
    url.searchParams.append('page', '1');
    url.searchParams.append('type', currentType);
    const response = await fetch(url.toString(), { headers: { 'X-API-KEY': KP_API_KEY, 'accept': 'application/json' } });
    if (!response.ok) throw new Error(`Ошибка ${response.status}`);
    const data = await response.json();
    if (data.items?.length > 0) {
        if (data.items.length === 1) {
            const item = data.items[0];
            await enrichKinopoiskData(item);
            displayKinopoiskItem(item);
        } else renderKinopoiskList(data.items);
    } else showError('Ничего не найдено');
}

async function searchRAWG(query) {
    const url = new URL(RAWG_BASE_URL + '/games');
    url.searchParams.append('key', RAWG_API_KEY);
    url.searchParams.append('search', query);
    url.searchParams.append('page_size', '20');
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Ошибка ${response.status}`);
    const data = await response.json();
    if (data.results?.length > 0) {
        if (data.results.length === 1) {
            const game = data.results[0];
            await enrichRAWGGame(game);
            displayRAWGGame(game);
        } else renderRAWGList(data.results);
    } else showError('Игры не найдены');
}

async function enrichKinopoiskData(item) {
    try {
        const url = new URL(KP_BASE_URL + `/films/${item.kinopoiskId}`);
        const response = await fetch(url.toString(), { headers: { 'X-API-KEY': KP_API_KEY } });
        if (response.ok) {
            const details = await response.json();
            item.filmLength = details.filmLength;
            item.countries = details.countries;
            item.description = details.description;
        }
    } catch { item.filmLength = item.filmLength || 0; }
}

async function enrichRAWGGame(game) {
    try {
        const url = new URL(RAWG_BASE_URL + `/games/${game.id}`);
        url.searchParams.append('key', RAWG_API_KEY);
        const response = await fetch(url.toString());
        if (response.ok) {
            const details = await response.json();
            game.playtime = details.playtime;
            game.description_raw = details.description_raw;
            game.platforms = details.platforms;
            game.metacritic = details.metacritic;
        }
    } catch { }
}

// ===== ОТОБРАЖЕНИЕ =====
function displayKinopoiskItem(item) {
    currentItem = item;
    
    if (item.kinopoiskId) {
        fetch(`${KP_BASE_URL}/films/${item.kinopoiskId}/external_sources`, { headers: { 'X-API-KEY': KP_API_KEY } })
        .then(r => r.json()).then(d => {
            if (d.tmdbId) {
                fetch(`https://api.themoviedb.org/3/movie/${d.tmdbId}?api_key=4fe84ce10842bd833b4dd306f37fbe5e&language=ru`)
                    .then(r => r.json()).then(t => {
                        if (t.poster_path) { moviePoster.src = TMDB_IMAGE_BASE + t.poster_path; moviePoster.style.display = 'block'; }
                        else throw new Error();
                    }).catch(() => {
                        moviePoster.src = item.posterUrl || item.posterUrlPreview || '';
                        moviePoster.style.display = moviePoster.src ? 'block' : 'none';
                    });
            } else throw new Error();
        }).catch(() => {
            moviePoster.src = item.posterUrl || item.posterUrlPreview || '';
            moviePoster.style.display = moviePoster.src ? 'block' : 'none';
        });
    }
    
    movieTitle.textContent = item.nameRu || item.nameOriginal || 'Без названия';
    movieYear.textContent = item.year || '????';
    const duration = item.filmLength || 0;
    movieDuration.textContent = currentType === 'TV_SERIES' ? '—' : formatDuration(duration);
    calcDurationMins.textContent = currentType === 'TV_SERIES' ? 0 : duration;
    durationLabel.innerHTML = currentType === 'TV_SERIES' ? 'Длительность' : `Длительность (<span id="calcDurationMins">${duration}</span> мин.)`;
    movieCountry.textContent = item.countries?.[0]?.country || '—';
    
    const rating = item.ratingKinopoisk?.toFixed(1) || '0.0';
    if (movieImdb) movieImdb.textContent = rating;
    calcRating.textContent = rating;
    
    movieImdbLink.href = `https://www.imdb.com/find?q=${encodeURIComponent(item.nameRu || item.nameOriginal || '')}`;
    movieKpLink.href = `https://www.kinopoisk.ru/film/${item.kinopoiskId}/`;
    movieKpLink.style.display = 'inline-flex';
    if (movieWikiLink) movieWikiLink.style.display = 'inline-flex';
    
    movieOverview.textContent = item.description || item.slogan || 'Описание отсутствует.';
    document.querySelector('.calculator-title').textContent = currentType === 'FILM' ? '🧮 КАЛЬКУЛЯЦИЯ: Фильм' : '🧮 КАЛЬКУЛЯЦИЯ: Сериал';
    document.querySelector('.calc-row:first-child .calc-label').textContent = currentType === 'FILM' ? 'Базовая стоимость' : 'Базовая стоимость серии';
    episodesRow.classList.toggle('hidden', currentType !== 'TV_SERIES');
    if (currentType === 'TV_SERIES' && episodesCount) episodesCount.value = 1;
    
    updateBasePriceDisplay();
    movieCard.classList.remove('hidden');
    calculatorBlock.classList.remove('hidden');
    calculatePrice();
}

function displayRAWGGame(game) {
    currentItem = game;
    
    if (game.background_image) { moviePoster.src = game.background_image; moviePoster.style.display = 'block'; }
    else { moviePoster.style.display = 'none'; }
    
    movieTitle.textContent = game.name || 'Без названия';
    movieYear.textContent = game.released ? game.released.split('-')[0] : '????';
    const playtime = game.playtime || 0;
    movieDuration.textContent = formatHours(playtime);
    calcDurationMins.textContent = playtime;
    durationLabel.innerHTML = `Время прохождения (<span id="calcDurationMins">${playtime}</span> ч)`;
    movieCountry.textContent = game.platforms?.map(p => p.platform.name).join(', ') || '—';
    
    const rating = game.metacritic || game.rating?.toFixed(1) || '0.0';
    if (movieImdb) movieImdb.textContent = rating;
    calcRating.textContent = rating;
    
    movieImdbLink.href = `https://www.metacritic.com/game/${game.slug}`;
    movieKpLink.style.display = 'none';
    if (movieWikiLink) movieWikiLink.style.display = 'none';
    
    movieOverview.textContent = game.description_raw || 'Описание отсутствует.';
    document.querySelector('.calculator-title').textContent = '🧮 КАЛЬКУЛЯЦИЯ: Игра';
    document.querySelector('.calc-row:first-child .calc-label').textContent = 'Базовая стоимость игры';
    episodesRow.classList.add('hidden');
    
    updateBasePriceDisplay();
    movieCard.classList.remove('hidden');
    calculatorBlock.classList.remove('hidden');
    calculatePrice();
}

// ===== СПИСКИ =====
function renderKinopoiskList(items) {
    const oldList = document.getElementById('movieList'); if (oldList) oldList.remove();
    const container = document.createElement('div'); container.id = 'movieList'; container.className = 'movie-list';
    const title = document.createElement('h3'); title.className = 'movie-list-title'; title.textContent = `Найдено ${items.length}:`; container.appendChild(title);
    const grid = document.createElement('div'); grid.className = 'movie-list-grid';
    items.forEach(item => {
        const card = document.createElement('div'); card.className = 'movie-list-card';
        const poster = item.posterUrlPreview || item.posterUrl || '';
        card.innerHTML = `${poster ? `<img src="${poster}" class="movie-list-poster">` : ''}<div class="movie-list-info"><div class="movie-list-name">${currentType === 'TV_SERIES' ? '📺' : '🎬'} ${item.nameRu || item.nameOriginal || ''}</div><div class="movie-list-year">${item.year || '????'}</div></div>`;
        card.addEventListener('click', async () => {
            searchBtn.textContent = '⏳'; searchBtn.disabled = true;
            await enrichKinopoiskData(item); displayKinopoiskItem(item); hideMovieList();
            searchBtn.textContent = 'НАЙТИ'; searchBtn.disabled = false;
        });
        grid.appendChild(card);
    });
    container.appendChild(grid);
    document.querySelector('.search-section').parentNode.insertBefore(container, document.querySelector('.search-section').nextSibling);
}

function renderRAWGList(games) {
    const oldList = document.getElementById('movieList'); if (oldList) oldList.remove();
    const container = document.createElement('div'); container.id = 'movieList'; container.className = 'movie-list';
    const title = document.createElement('h3'); title.className = 'movie-list-title'; title.textContent = `Найдено ${games.length}:`; container.appendChild(title);
    const grid = document.createElement('div'); grid.className = 'movie-list-grid';
    games.forEach(game => {
        const card = document.createElement('div'); card.className = 'movie-list-card';
        card.innerHTML = `${game.background_image ? `<img src="${game.background_image}" class="movie-list-poster">` : ''}<div class="movie-list-info"><div class="movie-list-name">🎮 ${game.name || ''}</div><div class="movie-list-year">${game.released?.split('-')[0] || '????'}</div></div>`;
        card.addEventListener('click', async () => {
            searchBtn.textContent = '⏳'; searchBtn.disabled = true;
            await enrichRAWGGame(game); displayRAWGGame(game); hideMovieList();
            searchBtn.textContent = 'НАЙТИ'; searchBtn.disabled = false;
        });
        grid.appendChild(card);
    });
    container.appendChild(grid);
    document.querySelector('.search-section').parentNode.insertBefore(container, document.querySelector('.search-section').nextSibling);
}

function hideMovieList() { const list = document.getElementById('movieList'); if (list) list.remove(); }
function hideMovieCard() { movieCard.classList.add('hidden'); calculatorBlock.classList.add('hidden'); }
function showError(text) { errorText.textContent = text.startsWith('❌') ? text : `❌ ${text}`; errorMessage.classList.remove('hidden'); }
function hideError() { errorMessage.classList.add('hidden'); }

function copyDonateText() {
    donateText.select(); donateText.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); copyBtn.textContent = '✅ Скопировано!'; setTimeout(() => copyBtn.textContent = '📋 Копировать', 1500); }
    catch { alert('Не удалось скопировать'); }
}

// ===== ОБРАБОТЧИКИ =====
searchBtn.addEventListener('click', () => search(searchInput.value.trim()));
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') search(searchInput.value.trim()); });
priorityCheckbox.addEventListener('change', calculatePrice);
copyBtn.addEventListener('click', copyDonateText);
if (episodesCount) { episodesCount.addEventListener('input', calculatePrice); episodesCount.addEventListener('change', calculatePrice); }

const filmBtn = document.getElementById('filmTypeBtn'), seriesBtn = document.getElementById('seriesTypeBtn'), gameBtn = document.getElementById('gameTypeBtn');
function setActiveType(type) {
    currentType = type;
    filmBtn.classList.toggle('active', type === 'FILM'); seriesBtn.classList.toggle('active', type === 'TV_SERIES'); gameBtn.classList.toggle('active', type === 'GAME');
    const subtitle = document.querySelector('.section-subtitle'), hint = document.querySelector('.search-hint');
    if (type === 'FILM') { subtitle.textContent = '# ЗАКАЗ ФИЛЬМОВ'; searchInput.placeholder = 'Поиск фильмов...'; hint.textContent = 'Поиск по базе TMDB'; }
    else if (type === 'TV_SERIES') { subtitle.textContent = '# ЗАКАЗ СЕРИАЛОВ'; searchInput.placeholder = 'Поиск сериалов...'; hint.textContent = 'Поиск по базе TMDB'; }
    else { subtitle.textContent = '# ЗАКАЗ ИГР'; searchInput.placeholder = 'Поиск игр...'; hint.textContent = 'Поиск по базе RAWG'; }
    updateBasePriceDisplay(); hideMovieCard(); hideMovieList();
}
filmBtn.addEventListener('click', () => setActiveType('FILM'));
seriesBtn.addEventListener('click', () => setActiveType('TV_SERIES'));
gameBtn.addEventListener('click', () => setActiveType('GAME'));

window.addEventListener('DOMContentLoaded', async () => { await loadPricingSettings(); console.log('🎬 Готово'); });
