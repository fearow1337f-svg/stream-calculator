// ===== НАСТРОЙКИ API =====
const KP_API_KEY = '3c6501fb-0e64-4d38-9df9-18509d27395e';
const KP_BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';
const RAWG_API_KEY = '7211c3c360a74c3180735f9b8ded07bc';
const RAWG_BASE_URL = 'https://api.rawg.io/api';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const STREAMER_NICKNAME = 'Dy2phoria';

// ===== НАСТРОЙКИ ЦЕН (по умолчанию) =====
let BASE_PRICE = 500;
let LONG_MOVIE_SURCHARGE = 20;
let SERIES_BASE_PRICE = 200;
let GAME_BASE_PRICE = 600;
let GAME_HOUR_SURCHARGE = 50;

let currentType = 'FILM'; // 'FILM', 'TV_SERIES', 'GAME'

// ===== DOM-ЭЛЕМЕНТЫ (с проверкой) =====
function getElement(id) {
    return document.getElementById(id);
}

function safeSetText(id, text) {
    const el = getElement(id);
    if (el) el.textContent = text;
}

function safeSetHTML(id, html) {
    const el = getElement(id);
    if (el) el.innerHTML = html;
}

function safeSetStyle(id, prop, value) {
    const el = getElement(id);
    if (el) el.style[prop] = value;
}

function safeSetHref(id, href) {
    const el = getElement(id);
    if (el) el.href = href;
}

function safeSetDisplay(id, display) {
    const el = getElement(id);
    if (el) el.style.display = display;
}

function safeAddClass(id, className) {
    const el = getElement(id);
    if (el) el.classList.add(className);
}

function safeRemoveClass(id, className) {
    const el = getElement(id);
    if (el) el.classList.remove(className);
}

function safeToggleClass(id, className, force) {
    const el = getElement(id);
    if (el) el.classList.toggle(className, force);
}

function safeQuery(selector) {
    return document.querySelector(selector);
}

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
    const baseValue = getElement('basePriceDisplay');
    if (!baseValue) return;
    
    if (currentType === 'FILM') baseValue.textContent = `${BASE_PRICE} ₽`;
    else if (currentType === 'TV_SERIES') baseValue.textContent = `${SERIES_BASE_PRICE} ₽`;
    else if (currentType === 'GAME') baseValue.textContent = `${GAME_BASE_PRICE} ₽`;
}

// ===== РАСЧЁТ ЦЕНЫ =====
let currentItem = null;

function calculatePrice() {
    if (!currentItem) return;
    
    let price = 0;
    let durationExtra = 0;
    let episodes = 1;
    const priorityCheckbox = getElement('priorityCheckbox');
    const ratingAdjustment = getElement('ratingAdjustment');
    const durationAdjustment = getElement('durationAdjustment');
    const totalPrice = getElement('totalPrice');
    const donateText = getElement('donateText');
    const episodesCount = getElement('episodesCount');
    
    if (currentType === 'FILM') {
        price = BASE_PRICE;
        const duration = currentItem.filmLength || 0;
        if (duration > 120) {
            durationExtra = LONG_MOVIE_SURCHARGE;
            price += durationExtra;
        }
        if (durationAdjustment) durationAdjustment.textContent = `+${durationExtra} ₽`;
    } else if (currentType === 'TV_SERIES') {
        price = SERIES_BASE_PRICE;
        episodes = parseInt(episodesCount?.value) || 1;
        price = price * episodes;
        if (durationAdjustment) durationAdjustment.textContent = '—';
    } else if (currentType === 'GAME') {
        price = GAME_BASE_PRICE;
        const playtime = currentItem.playtime || 0;
        if (playtime > 0) {
            durationExtra = playtime * GAME_HOUR_SURCHARGE;
            price += durationExtra;
        }
        if (durationAdjustment) durationAdjustment.textContent = `+${durationExtra} ₽`;
    }
    
    if (priorityCheckbox?.checked) price = price * 2;
    
    if (ratingAdjustment) ratingAdjustment.textContent = `+0 ₽`;
    if (totalPrice) totalPrice.textContent = `${formatMoney(price)} ₽`;
    
    const itemName = currentItem.nameRu || currentItem.nameOriginal || currentItem.name || 'Без названия';
    const priorityText = priorityCheckbox?.checked ? ' (ВНЕ ОЧЕРЕДИ)' : '';
    let detailsText = '';
    
    if (currentType === 'TV_SERIES') detailsText = ` — ${episodes} серий`;
    else if (currentType === 'GAME') detailsText = ` — ${currentItem.playtime || 0} ч`;
    
    if (donateText) donateText.value = `${itemName}${detailsText}${priorityText}`;
}

// ===== ПОИСК =====
async function search(query) {
    const searchBtn = getElement('searchBtn');
    const errorMessage = getElement('errorMessage');
    const errorText = getElement('errorText');
    
    if (!query || query.length < 2) {
        showError('Введи хотя бы 2 символа');
        return;
    }
    
    if (searchBtn) {
        searchBtn.textContent = '⏳';
        searchBtn.disabled = true;
    }
    hideError();
    hideMovieCard();
    hideMovieList();
    
    try {
        if (currentType === 'FILM' || currentType === 'TV_SERIES') {
            await searchKinopoisk(query);
        } else if (currentType === 'GAME') {
            await searchRAWG(query);
        }
    } catch (error) {
        showError(`❌ ${error.message}`);
    } finally {
        if (searchBtn) {
            searchBtn.textContent = 'НАЙТИ';
            searchBtn.disabled = false;
        }
    }
}

async function searchKinopoisk(query) {
    const url = new URL(KP_BASE_URL + '/films');
    url.searchParams.append('keyword', query);
    url.searchParams.append('page', '1');
    url.searchParams.append('type', currentType);
    
    const response = await fetch(url.toString(), {
        headers: { 'X-API-KEY': KP_API_KEY, 'accept': 'application/json' }
    });
    
    if (!response.ok) throw new Error(`Ошибка ${response.status}`);
    
    const data = await response.json();
    
    if (data.items?.length > 0) {
        if (data.items.length === 1) {
            const item = data.items[0];
            await enrichKinopoiskData(item);
            displayKinopoiskItem(item);
        } else {
            renderKinopoiskList(data.items);
        }
    } else {
        showError('Ничего не найдено');
    }
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
        } else {
            renderRAWGList(data.results);
        }
    } else {
        showError('Игры не найдены');
    }
}

async function enrichKinopoiskData(item) {
    try {
        const url = new URL(KP_BASE_URL + `/films/${item.kinopoiskId}`);
        const response = await fetch(url.toString(), {
            headers: { 'X-API-KEY': KP_API_KEY }
        });
        if (response.ok) {
            const details = await response.json();
            item.filmLength = details.filmLength;
            item.countries = details.countries;
            item.description = details.description;
        }
    } catch {
        item.filmLength = item.filmLength || 0;
    }
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
    } catch {
        // Игнорируем ошибки обогащения
    }
}

// ===== ОТОБРАЖЕНИЕ КАРТОЧКИ =====
function displayKinopoiskItem(item) {
    currentItem = item;
    
    // Постер
    const moviePoster = getElement('moviePoster');
    if (item.kinopoiskId) {
        fetch(`${KP_BASE_URL}/films/${item.kinopoiskId}/external_sources`, {
            headers: { 'X-API-KEY': KP_API_KEY }
        })
        .then(r => r.json())
        .then(d => {
            if (d.tmdbId) {
                fetch(`https://api.themoviedb.org/3/movie/${d.tmdbId}?api_key=4fe84ce10842bd833b4dd306f37fbe5e&language=ru`)
                    .then(r => r.json())
                    .then(t => {
                        if (t.poster_path && moviePoster) {
                            moviePoster.src = TMDB_IMAGE_BASE + t.poster_path;
                            moviePoster.style.display = 'block';
                        } else {
                            throw new Error('No poster');
                        }
                    })
                    .catch(() => {
                        if (moviePoster) {
                            moviePoster.src = item.posterUrl || item.posterUrlPreview || '';
                            moviePoster.style.display = moviePoster.src ? 'block' : 'none';
                        }
                    });
            } else {
                throw new Error('No TMDB ID');
            }
        })
        .catch(() => {
            if (moviePoster) {
                moviePoster.src = item.posterUrl || item.posterUrlPreview || '';
                moviePoster.style.display = moviePoster.src ? 'block' : 'none';
            }
        });
    } else if (moviePoster) {
        moviePoster.src = item.posterUrl || item.posterUrlPreview || '';
        moviePoster.style.display = moviePoster.src ? 'block' : 'none';
    }
    
    safeSetText('movieTitle', item.nameRu || item.nameOriginal || 'Без названия');
    safeSetText('movieYear', item.year || '????');
    
    const duration = item.filmLength || 0;
    safeSetText('movieDuration', currentType === 'TV_SERIES' ? '—' : formatDuration(duration));
    safeSetText('calcDurationMins', currentType === 'TV_SERIES' ? '0' : String(duration));
    safeSetHTML('durationLabel', currentType === 'TV_SERIES' ? 'Длительность' : `Длительность (<span id="calcDurationMins">${duration}</span> мин.)`);
    
    safeSetText('movieCountry', item.countries?.[0]?.country || '—');
    
    const rating = item.ratingKinopoisk?.toFixed(1) || '0.0';
    safeSetText('movieImdb', rating);
    safeSetText('calcRating', rating);
    
    safeSetHref('movieImdbLink', `https://www.imdb.com/find?q=${encodeURIComponent(item.nameRu || item.nameOriginal || '')}`);
    safeSetHref('movieKpLink', `https://www.kinopoisk.ru/film/${item.kinopoiskId}/`);
    safeSetDisplay('movieKpLink', 'inline-flex');
    safeSetDisplay('movieWikiLink', 'inline-flex');
    
    safeSetText('movieOverview', item.description || item.slogan || 'Описание отсутствует.');
    
    const calcTitle = safeQuery('.calculator-title');
    if (calcTitle) calcTitle.textContent = currentType === 'FILM' ? '🧮 КАЛЬКУЛЯЦИЯ: Фильм' : '🧮 КАЛЬКУЛЯЦИЯ: Сериал';
    
    const baseLabel = safeQuery('.calc-row:first-child .calc-label');
    if (baseLabel) baseLabel.textContent = currentType === 'FILM' ? 'Базовая стоимость' : 'Базовая стоимость серии';
    
    const episodesRow = getElement('episodesRow');
    const episodesCount = getElement('episodesCount');
    if (episodesRow) episodesRow.classList.toggle('hidden', currentType !== 'TV_SERIES');
    if (currentType === 'TV_SERIES' && episodesCount) episodesCount.value = '1';
    
    updateBasePriceDisplay();
    
    const movieCard = getElement('movieCard');
    const calculatorBlock = getElement('calculatorBlock');
    if (movieCard) movieCard.classList.remove('hidden');
    if (calculatorBlock) calculatorBlock.classList.remove('hidden');
    
    calculatePrice();
}

function displayRAWGGame(game) {
    currentItem = game;
    
    const moviePoster = getElement('moviePoster');
    if (moviePoster) {
        if (game.background_image) {
            moviePoster.src = game.background_image;
            moviePoster.style.display = 'block';
        } else {
            moviePoster.style.display = 'none';
        }
    }
    
    safeSetText('movieTitle', game.name || 'Без названия');
    safeSetText('movieYear', game.released ? game.released.split('-')[0] : '????');
    
    const playtime = game.playtime || 0;
    safeSetText('movieDuration', formatHours(playtime));
    safeSetText('calcDurationMins', String(playtime));
    safeSetHTML('durationLabel', `Время прохождения (<span id="calcDurationMins">${playtime}</span> ч)`);
    
    safeSetText('movieCountry', game.platforms?.map(p => p.platform.name).join(', ') || '—');
    
    const rating = game.metacritic || game.rating?.toFixed(1) || '0.0';
    safeSetText('movieImdb', rating);
    safeSetText('calcRating', rating);
    
    safeSetHref('movieImdbLink', `https://www.metacritic.com/game/${game.slug}`);
    safeSetDisplay('movieKpLink', 'none');
    safeSetDisplay('movieWikiLink', 'none');
    
    safeSetText('movieOverview', game.description_raw || 'Описание отсутствует.');
    
    const calcTitle = safeQuery('.calculator-title');
    if (calcTitle) calcTitle.textContent = '🧮 КАЛЬКУЛЯЦИЯ: Игра';
    
    const baseLabel = safeQuery('.calc-row:first-child .calc-label');
    if (baseLabel) baseLabel.textContent = 'Базовая стоимость игры';
    
    const episodesRow = getElement('episodesRow');
    if (episodesRow) episodesRow.classList.add('hidden');
    
    updateBasePriceDisplay();
    
    const movieCard = getElement('movieCard');
    const calculatorBlock = getElement('calculatorBlock');
    if (movieCard) movieCard.classList.remove('hidden');
    if (calculatorBlock) calculatorBlock.classList.remove('hidden');
    
    calculatePrice();
}

// ===== СПИСКИ =====
function renderKinopoiskList(items) {
    const oldList = getElement('movieList');
    if (oldList) oldList.remove();
    
    const container = document.createElement('div');
    container.id = 'movieList';
    container.className = 'movie-list';
    
    const title = document.createElement('h3');
    title.className = 'movie-list-title';
    title.textContent = `Найдено ${items.length}:`;
    container.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'movie-list-grid';
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-list-card';
        const poster = item.posterUrlPreview || item.posterUrl || '';
        const typeIcon = currentType === 'TV_SERIES' ? '📺' : '🎬';
        
        card.innerHTML = `
            ${poster ? `<img src="${poster}" class="movie-list-poster">` : ''}
            <div class="movie-list-info">
                <div class="movie-list-name">${typeIcon} ${item.nameRu || item.nameOriginal || 'Без названия'}</div>
                <div class="movie-list-year">${item.year || '????'}</div>
            </div>
        `;
        
        card.addEventListener('click', async () => {
            const searchBtn = getElement('searchBtn');
            if (searchBtn) {
                searchBtn.textContent = '⏳';
                searchBtn.disabled = true;
            }
            await enrichKinopoiskData(item);
            displayKinopoiskItem(item);
            hideMovieList();
            if (searchBtn) {
                searchBtn.textContent = 'НАЙТИ';
                searchBtn.disabled = false;
            }
        });
        
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    const searchSection = safeQuery('.search-section');
    if (searchSection?.parentNode) {
        searchSection.parentNode.insertBefore(container, searchSection.nextSibling);
    }
}

function renderRAWGList(games) {
    const oldList = getElement('movieList');
    if (oldList) oldList.remove();
    
    const container = document.createElement('div');
    container.id = 'movieList';
    container.className = 'movie-list';
    
    const title = document.createElement('h3');
    title.className = 'movie-list-title';
    title.textContent = `Найдено ${games.length}:`;
    container.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'movie-list-grid';
    
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'movie-list-card';
        
        card.innerHTML = `
            ${game.background_image ? `<img src="${game.background_image}" class="movie-list-poster">` : ''}
            <div class="movie-list-info">
                <div class="movie-list-name">🎮 ${game.name || 'Без названия'}</div>
                <div class="movie-list-year">${game.released?.split('-')[0] || '????'}</div>
            </div>
        `;
        
        card.addEventListener('click', async () => {
            const searchBtn = getElement('searchBtn');
            if (searchBtn) {
                searchBtn.textContent = '⏳';
                searchBtn.disabled = true;
            }
            await enrichRAWGGame(game);
            displayRAWGGame(game);
            hideMovieList();
            if (searchBtn) {
                searchBtn.textContent = 'НАЙТИ';
                searchBtn.disabled = false;
            }
        });
        
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    const searchSection = safeQuery('.search-section');
    if (searchSection?.parentNode) {
        searchSection.parentNode.insertBefore(container, searchSection.nextSibling);
    }
}

function hideMovieList() {
    const list = getElement('movieList');
    if (list) list.remove();
}

function hideMovieCard() {
    const movieCard = getElement('movieCard');
    const calculatorBlock = getElement('calculatorBlock');
    if (movieCard) movieCard.classList.add('hidden');
    if (calculatorBlock) calculatorBlock.classList.add('hidden');
}

function showError(text) {
    const errorMessage = getElement('errorMessage');
    const errorText = getElement('errorText');
    if (errorText) errorText.textContent = text.startsWith('❌') ? text : `❌ ${text}`;
    if (errorMessage) errorMessage.classList.remove('hidden');
}

function hideError() {
    const errorMessage = getElement('errorMessage');
    if (errorMessage) errorMessage.classList.add('hidden');
}

function copyDonateText() {
    const donateText = getElement('donateText');
    const copyBtn = getElement('copyBtn');
    if (!donateText) return;
    
    donateText.select();
    donateText.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy');
        if (copyBtn) {
            copyBtn.textContent = '✅ Скопировано!';
            setTimeout(() => { if (copyBtn) copyBtn.textContent = '📋 Копировать'; }, 1500);
        }
    } catch {
        alert('Не удалось скопировать. Скопируй вручную.');
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    const searchBtn = getElement('searchBtn');
    const searchInput = getElement('movieSearch');
    const priorityCheckbox = getElement('priorityCheckbox');
    const copyBtn = getElement('copyBtn');
    const episodesCount = getElement('episodesCount');
    
    if (searchBtn) searchBtn.addEventListener('click', () => {
        if (searchInput) search(searchInput.value.trim());
    });
    
    if (searchInput) searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') search(searchInput.value.trim());
    });
    
    if (priorityCheckbox) priorityCheckbox.addEventListener('change', calculatePrice);
    if (copyBtn) copyBtn.addEventListener('click', copyDonateText);
    if (episodesCount) {
        episodesCount.addEventListener('input', calculatePrice);
        episodesCount.addEventListener('change', calculatePrice);
    }
    
    const filmBtn = getElement('filmTypeBtn');
    const seriesBtn = getElement('seriesTypeBtn');
    const gameBtn = getElement('gameTypeBtn');
    
    function setActiveType(type) {
        currentType = type;
        
        if (filmBtn) filmBtn.classList.toggle('active', type === 'FILM');
        if (seriesBtn) seriesBtn.classList.toggle('active', type === 'TV_SERIES');
        if (gameBtn) gameBtn.classList.toggle('active', type === 'GAME');
        
        const subtitle = safeQuery('.section-subtitle');
        const hint = safeQuery('.search-hint');
        
        if (type === 'FILM') {
            if (subtitle) subtitle.textContent = '# ЗАКАЗ ФИЛЬМОВ';
            if (searchInput) searchInput.placeholder = 'Поиск фильмов...';
            if (hint) hint.textContent = 'Поиск по базе TMDB';
        } else if (type === 'TV_SERIES') {
            if (subtitle) subtitle.textContent = '# ЗАКАЗ СЕРИАЛОВ';
            if (searchInput) searchInput.placeholder = 'Поиск сериалов...';
            if (hint) hint.textContent = 'Поиск по базе TMDB';
        } else {
            if (subtitle) subtitle.textContent = '# ЗАКАЗ ИГР';
            if (searchInput) searchInput.placeholder = 'Поиск игр...';
            if (hint) hint.textContent = 'Поиск по базе RAWG';
        }
        
        updateBasePriceDisplay();
        hideMovieCard();
        hideMovieList();
    }
    
    if (filmBtn) filmBtn.addEventListener('click', () => setActiveType('FILM'));
    if (seriesBtn) seriesBtn.addEventListener('click', () => setActiveType('TV_SERIES'));
    if (gameBtn) gameBtn.addEventListener('click', () => setActiveType('GAME'));
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadPricingSettings();
    init();
    console.log('🎬 Калькулятор загружен! API: Кинопоиск + RAWG + TMDB');
});
