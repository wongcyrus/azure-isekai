const { app } = require('@azure/functions');

app.http('grader', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
                const header = request.headers.get('x-ms-client-principal');
        const encoded = Buffer.from(header, 'base64');
        const decoded = encoded.toString('ascii');
        const clientPrincipal = JSON.parse(decoded);
        const email = clientPrincipal?.userDetails?.email || 'unknown';
        context.log(`HTTP GET /grader called with URL: ${request.url}`);

        const game = request.query.get('game') || 'unknown';
        const phrase = request.query.get('phrase') || 'unknown';
        const npc = request.query.get('npc') || 'unknown';

        return {
            status: 200,
            jsonBody: {
                status: 'OK',
                message: `Grading for ${npc} in game ${game} with phrase ${phrase} completed successfully! ${email}`,
                next_game_phrase: 'CHALLENGE',
                report_url: 'https://example.com/report',
                easter_egg_url: 'https://example.com/easter-egg'
            }
        };
    }
});
