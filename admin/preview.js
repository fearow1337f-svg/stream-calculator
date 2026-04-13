// Ждём загрузки CMS
CMS.registerEventListener({
    name: 'preSave',
    handler: async ({ entry }) => {
        const searchTitle = entry.get('data').get('searchTitle');
        const currentPoster = entry.get('data').get('poster');
        
        // Если постер уже есть или название не введено — ничего не делаем
        if (currentPoster || !searchTitle || searchTitle.length < 2) {
            return;
        }
        
        try {
            console.log('Ищу постер для:', searchTitle);
            
            // Вызываем нашу функцию
            const response = await fetch(`/get-poster?query=${encodeURIComponent(searchTitle)}`);
            const data = await response.json();
            
            if (data.poster) {
                // Устанавливаем URL постера
                entry.get('data').set('poster', data.poster);
                console.log('Постер установлен:', data.poster);
            }
            
            if (data.kinopoiskId) {
                entry.get('data').set('kinopoiskId', data.kinopoiskId.toString());
            }
        } catch (error) {
            console.warn('Не удалось загрузить постер:', error);
        }
    }
});

console.log('🎬 Кастомный скрипт загружен!');
