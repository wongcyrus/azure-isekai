const { app } = require('@azure/functions');
const fetch = require('node-fetch');

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

        context.log(`Game: ${game}, NPC: ${npc}, User: ${email}`);
        const gameTaskFunctionUrl = process.env.GameTaskFunctionUrl;
        if (!gameTaskFunctionUrl) {
            context.log.error('GameTaskFunctionUrl environment variable is not set.');
            throw new Error('GameTaskFunctionUrl environment variable is not set.');
        }

        const params = new URLSearchParams({
            game,
            npc,
            email
        });

        const response = await fetch(`${gameTaskFunctionUrl}?${params.toString()}`, {
            method: 'GET'
        });

        if (!response.ok) {
            context.log.error(`Failed to call GameTaskFunctionUrl: ${response.statusText}`);
            throw new Error(`Failed to call GameTaskFunctionUrl: ${response.statusText}`);
        }

        const data = await response.json();
        context.log('Response from GameTaskFunctionUrl:', data);
        const data_str = JSON.stringify(data);

        return {
            status: 200,
            jsonBody: {
                status: 'OK',
                message: `Game task for ${npc} in game ${game} created successfully! ${email} ${data_str}`,
                next_game_phrase: 'SETUP',
                report_url: 'https://example.com/report',
                easter_egg_url: 'https://example.com/easter-egg'
            }
        };
    }
});
