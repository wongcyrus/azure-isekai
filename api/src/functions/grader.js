const { app } = require('@azure/functions');

app.http('grader', {
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

            context.log(`HTTP GET /grader called with URL: ${request.url}`);

            // Don't proxy the call if email is unknown (user not authenticated)
            if (email === 'unknown') {
                context.log.error('User not authenticated - email is unknown');
                return {
                    status: 401,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'Authentication required. Please login to access the grader service.'
                    }
                };
            }

            const game = request.query.get('game') || 'unknown';
            const npc = request.query.get('npc') || 'unknown';

            context.log(`Game: ${game}, NPC: ${npc}, User: ${email}`);

            const graderFunctionUrl = process.env.GraderFunctionUrl;
            context.log(`GraderFunctionUrl: ${graderFunctionUrl}`);
            
            if (!graderFunctionUrl) {
                context.log.error('GraderFunctionUrl environment variable is not set.');
                return {
                    status: 500,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'GraderFunctionUrl environment variable is not set.'
                    }
                };
            }

            // For game grading, we call the grader with game mode flag
            const params = new URLSearchParams({
                email,
                game,
                npc,
                gameMode: 'true' // Flag to indicate this is a game grading request
                // Note: phrase parameter removed - simplified to just run grading
            });

            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                context.log.error('Fetch request to GraderFunctionUrl timed out.');
            }, 120000); // 2 minutes timeout for grading

            let response;
            try {
                const fullUrl = `${graderFunctionUrl}&${params.toString()}`;
                context.log(`Calling GraderFunctionUrl with: ${fullUrl}`);
                response = await fetch(fullUrl, {
                    method: 'GET',
                    signal: controller.signal
                });
            } catch (err) {
                clearTimeout(timeout);
                context.log.error('Error calling GraderFunctionUrl:', err);
                return {
                    status: 500,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'Failed to connect to grader service'
                    }
                };
            }
            clearTimeout(timeout);

            if (!response.ok) {
                context.log.error(`Failed to call GraderFunctionUrl: ${response.statusText}`);
                return {
                    status: response.status,
                    jsonBody: {
                        status: 'ERROR',
                        message: `Failed to call GraderFunctionUrl: ${response.statusText}`
                    }
                };
            }

            const data = await response.json();
            context.log('Response from GraderFunctionUrl:', data);

            // Transform the response to match the expected format
            const gameResponse = {
                status: data.status || 'OK',
                message: data.message || `Grading for ${npc} in game ${game} completed successfully!`,
                next_game_phrase: data.nextGamePhrase || 'TASK_ASSIGNED',
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
            context.log.error('Unhandled error in grader function:', error);
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
