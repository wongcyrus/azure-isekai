const { app } = require('@azure/functions');

app.http('game-task', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const header = request.headers.get('x-ms-client-principal');
            let email = 'unknown';
            
            if (header) {
                try {
                    const encoded = Buffer.from(header, 'base64');
                    const decoded = encoded.toString('ascii');
                    const clientPrincipal = JSON.parse(decoded);
                    email = clientPrincipal?.userDetails || 'unknown';
                } catch (authError) {
                    context.log.warn('Failed to parse authentication header:', authError);
                }
            }

            context.log(`HTTP GET /game-task called with URL: ${request.url}`);

            // Don't proxy the call if email is unknown (user not authenticated)
            if (email === 'unknown') {
                context.log.error('User not authenticated - email is unknown');
                return {
                    status: 401,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'Authentication required. Please login to access the game task service.'
                    }
                };
            }

            const game = request.query.get('game') || 'unknown';
            const npc = request.query.get('npc') || 'unknown';

            context.log(`Game: ${game}, NPC: ${npc}, User: ${email}`);
            
            const gameTaskFunctionUrl = process.env.GameTaskFunctionUrl;
            context.log(`GameTaskFunctionUrl: ${gameTaskFunctionUrl}`);
            
            if (!gameTaskFunctionUrl) {
                context.log.error('GameTaskFunctionUrl environment variable is not set.');
                return {
                    status: 500,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'GameTaskFunctionUrl environment variable is not set.'
                    }
                };
            }

            const params = new URLSearchParams({
                game,
                npc,
                email
            });

            // Add timeout to prevent hanging fetch
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                context.log.error('Fetch request to GameTaskFunctionUrl timed out.');
            }, 60000); // 60 seconds timeout

            let response;
            try {
                const fullUrl = `${gameTaskFunctionUrl}&${params.toString()}`;
                context.log(`Calling GameTaskFunctionUrl with: ${fullUrl}`);
                response = await fetch(fullUrl, {
                    method: 'GET',
                    signal: controller.signal
                });
            } catch (err) {
                clearTimeout(timeout);
                context.log.error('Error calling GameTaskFunctionUrl:', err);
                return {
                    status: 500,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'Failed to connect to game task service'
                    }
                };
            }
            clearTimeout(timeout);

            if (!response.ok) {
                context.log.error(`Failed to call GameTaskFunctionUrl: ${response.statusText}`);
                return {
                    status: response.status,
                    jsonBody: {
                        status: 'ERROR',
                        message: `Failed to call GameTaskFunctionUrl: ${response.statusText}`
                    }
                };
            }

            const data = await response.json();
            context.log('Response from GameTaskFunctionUrl:', data);

            // Transform the response to match the expected format
            const gameResponse = {
                status: data.status || 'OK',
                message: data.message || `Game task for ${npc} in game ${game} processed successfully!`,
                next_game_phrase: data.nextGamePhrase || 'SETUP',
                report_url: data.reportUrl || '',
                easter_egg_url: data.easterEggUrl || '',
                score: data.score || 0,
                completed_tasks: data.completedTasks || 0,
                task_name: data.taskName || '',
                task_completed: data.taskCompleted || false,
                additional_data: data.additionalData || {}
            };

            return {
                status: 200,
                jsonBody: gameResponse
            };
        } catch (error) {
            context.log.error('Unhandled error in game-task function:', error);
            return {
                status: 500,
                jsonBody: {
                    status: 'ERROR',
                    message: 'Internal server error occurred'
                }
            };
        }
    }
});
