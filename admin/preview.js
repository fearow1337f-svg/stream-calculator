// Ждём загрузки CMS
CMS.registerEventListener({
    name: 'preSave',
    handler: async ({ entry }) => {
        // Получаем данные из правильного места
        const data = entry.get('data');
        const searchTitle = data.get('searchTitle');
        const currentPoster = data.get('poster');
        
        console.log('preSave сработал!');
        console.log('searchTitle:', searchTitle);
        console.log('currentPoster:', currentPoster);
        
        // Если постер уже есть или название не введено — ничего не делаем
        if (currentPoster || !searchTitle || searchTitle.length < 2) {
            console.log('Пропускаем — постер уже есть или название короткое');
            return;
        }
        
        try {
            console.log('Ищу постер для:', searchTitle);
            
            // Вызываем нашу функцию
            const response = await fetch(`/get-poster?query=${encodeURIComponent(searchTitle)}`);
            const data = await response.json();
            
            console.log('Ответ от API:', data);
            
            if (data.poster) {
                // Устанавливаем URL постера
                data.set('poster', data.poster);
                console.log('Постер установлен:', data.poster);
            }
            
            if (data.kinopoiskId) {
                data.set('kinopoiskId', data.kinopoiskId.toString());
            }
        } catch (error) {
            console.error('Ошибка при загрузке постера:', error);
        }
    }
});

console.log('🎬 Кастомный скрипт загружен!');
