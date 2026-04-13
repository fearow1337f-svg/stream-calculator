// Обработчик авторизации GitHub OAuth для Decap CMS
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Начало авторизации: редирект на GitHub
    if (path === '/oauth/auth') {
        const clientId = env.GITHUB_CLIENT_ID;
        const redirectUri = `${url.origin}/oauth/callback`;
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;
        return Response.redirect(githubAuthUrl, 302);
    }

    // 2. Callback от GitHub: обмен кода на токен и отправка в CMS
    if (path === '/oauth/callback') {
        const code = url.searchParams.get('code');
        if (!code) {
            return new Response('No code provided', { status: 400 });
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

            // Возвращаем скрипт, который передаст токен в CMS
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <script>
                        (function() {
                            const message = {
                                token: '${tokenData.access_token}',
                                provider: 'github'
                            };
                            window.opener.postMessage(JSON.stringify(message), '*');
                            window.close();
                        })();
                    </script>
                </body>
                </html>
            `;
            return new Response(html, {
                headers: { 'Content-Type': 'text/html' },
            });
        } catch (error) {
            return new Response(`OAuth Error: ${error.message}`, { status: 500 });
        }
    }

    return new Response('Not found', { status: 404 });
}
