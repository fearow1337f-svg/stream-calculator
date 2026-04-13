// Кастомный виджет для автоподгрузки постера
const AutoPosterControl = createClass({
    getInitialState() {
        return { isLoading: false, error: null };
    },

    async fetchPoster() {
        const searchTitle = this.props.value;
        if (!searchTitle || searchTitle.length < 2) return;

        this.setState({ isLoading: true, error: null });

        try {
            const response = await fetch(`/get-poster?query=${encodeURIComponent(searchTitle)}`);
            const data = await response.json();

            if (data.poster) {
                // Обновляем поле poster в форме
                const posterField = this.props.entry.get('data').get('poster');
                if (!posterField) {
                    this.props.entry.get('data').set('poster', data.poster);
                }
                
                // Обновляем ID Кинопоиска
                if (data.kinopoiskId) {
                    this.props.entry.get('data').set('kinopoiskId', data.kinopoiskId.toString());
                }

                console.log('✅ Постер найден:', data.poster);
            } else {
                this.setState({ error: 'Фильм не найден' });
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.setState({ error: 'Ошибка загрузки' });
        } finally {
            this.setState({ isLoading: false });
        }
    },

    render() {
        const { value, onChange } = this.props;
        const { isLoading, error } = this.state;

        return h('div', {},
            h('input', {
                type: 'text',
                value: value || '',
                placeholder: 'Введите название фильма',
                onChange: (e) => onChange(e.target.value),
                onBlur: () => this.fetchPoster(),
                style: {
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                }
            }),
            isLoading && h('span', { style: { marginLeft: '10px', color: '#666' } }, '⏳ Ищу постер...'),
            error && h('span', { style: { marginLeft: '10px', color: 'red' } }, `❌ ${error}`),
            h('p', { style: { fontSize: '12px', color: '#666', marginTop: '4px' } }, 
                'После ввода названия нажмите Tab или кликните вне поля — постер подгрузится автоматически'
            )
        );
    }
});

// Регистрируем кастомный виджет
CMS.registerWidget('autoposter', AutoPosterControl);

console.log('🎬 Кастомный виджет загружен!');
