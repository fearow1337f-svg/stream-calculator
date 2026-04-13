// Кастомный виджет для автоподгрузки постера
CMS.registerEventListener({
    name: 'preSave',
    handler: async ({ entry }) => {
        const searchTitle = entry.get('searchTitle');
        const currentPoster = entry.get('poster');
        
        // Если постер уже есть или название не введено — ничего не делаем
        if (currentPoster || !searchTitle || searchTitle.length < 2) {
            return;
        }
        
        try {
            // Вызываем нашу функцию на Cloudflare
            const response = await fetch(`/get-poster?query=${encodeURIComponent(searchTitle)}`);
            const data = await response.json();
            
            if (data.poster) {
                // Загружаем постер в медиа-библиотеку CMS
                const mediaProxy = CMS.getMediaLibrary();
                // Устанавливаем URL постера
                entry.set('poster', data.poster);
            }
            
            if (data.kinopoiskId) {
                entry.set('kinopoiskId', data.kinopoiskId.toString());
            }
        } catch (error) {
            console.warn('Не удалось загрузить постер:', error);
        }
    }
});
