const { app } = require('@azure/functions');

app.http('game-task', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {

        const header = request.headers.get('x-ms-client-principal');
        const encoded = Buffer.from(header, 'base64');
        const decoded = encoded.toString('ascii');
        const clientPrincipal = JSON.parse(decoded);
        const email = clientPrincipal?.userDetails || 'unknown';

        context.log(`HTTP GET /game-task called with URL: ${request.url}`);

        const game = request.query.get('game') || 'unknown';
        const npc = request.query.get('npc') || 'unknown';

        return {
            status: 200,
            jsonBody: {
                status: 'OK',
                message: `Game task for ${npc} in game ${game} created successfully! ${email}`,
                next_game_phrase: 'SETUP',
                report_url: 'https://example.com/report',
                easter_egg_url: 'https://example.com/easter-egg'
            }
        };
    }
});
