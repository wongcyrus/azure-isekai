const { app } = require('@azure/functions');

app.http('grader', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP GET /grader called with URL: ${request.url}`);

        const game = request.query.get('game') || 'unknown';
        const phrase = request.query.get('phrase') || 'unknown';
        const npc = request.query.get('npc') || 'unknown';

        return {
            status: 200,
            jsonBody: {
                status: 'OK',
                message: `Grading for ${npc} in game ${game} with phrase ${phrase} completed successfully!`,
                next_game_phrase: 'CHALLENGE',
                report_url: 'https://example.com/report',
                easter_egg_url: 'https://example.com/easter-egg'
            }
        };
    }
});
