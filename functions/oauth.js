// Упрощённый и надёжный OAuth-прокси для Decap CMS
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Шаг авторизации: редирект на GitHub
    if (path === '/oauth/auth') {
        const clientId = env.GITHUB_CLIENT_ID;
        const redirectUri = `${url.origin}/oauth/callback`;
        const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;
        return Response.redirect(githubUrl, 302);
    }

    // 2. Callback от GitHub: обмен кода на токен и отправка в CMS
    if (path === '/oauth/callback') {
        const code = url.searchParams.get('code');
        if (!code) {
            return new Response('Ошибка: не получен код авторизации от GitHub.', { status: 400 });
        }

        try {
            // Обмениваем код на access_token
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    client_id: env.GITHUB_CLIENT_ID,
                    client_secret: env.GITHUB_CLIENT_SECRET,
                    code: code,
                }),
            });

            const tokenData = await tokenResponse.json();
            if (tokenData.error) {
                throw new Error(tokenData.error_description || tokenData.error);
            }

            // ВАЖНО: Возвращаем страницу, которая передаст токен в CMS и закроет окно
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>Авторизация...</title></head>
                <body>
                    <script>
                        (function() {
                            const token = '${tokenData.access_token}';
                            if (window.opener) {
                                window.opener.postMessage(JSON.stringify({
                                    token: token,
                                    provider: 'github'
                                }), '*');
                                setTimeout(() => window.close(), 100);
                            } else {
                                document.body.innerHTML = '<p>Окно авторизации можно закрыть.</p>';
                            }
                        })();
                    </script>
                </body>
                </html>
            `;
            return new Response(html, { headers: { 'Content-Type': 'text/html' } });

        } catch (error) {
            return new Response(`Ошибка авторизации: ${error.message}`, { status: 500 });
        }
    }

    return new Response('Не найдено', { status: 404 });
}
