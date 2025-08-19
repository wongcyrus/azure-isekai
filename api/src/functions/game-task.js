const { app } = require('@azure/functions');

app.http('game-task', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP GET /game-task called with URL: ${request.url}`);

        const game = request.query.get('game') || 'unknown';
        const npc = request.query.get('npc') || 'unknown';

        return {
            status: 200,
            jsonBody: {
                status: 'OK',
                message: `Game task for ${npc} in game ${game} created successfully!`,
                next_game_phrase: 'SETUP',
                report_url: 'https://example.com/report',
                easter_egg_url: 'https://example.com/easter-egg'
            }
        };
    }
});
