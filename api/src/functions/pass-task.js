const { app } = require('@azure/functions');

app.http('pass-task', {
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

            context.log(`HTTP GET /pass-task called with URL: ${request.url}`);

            if (email === 'unknown') {
                context.log.error('User not authenticated - email is unknown');
                return {
                    status: 401,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'Authentication required. Please login to access the pass task service.'
                    }
                };
            }

            const passTaskFunctionUrl = process.env.PassTaskFunctionUrl;
            context.log(`PassTaskFunctionUrl: ${passTaskFunctionUrl}`);
            
            if (!passTaskFunctionUrl) {
                context.log.error('PassTaskFunctionUrl environment variable is not set.');
                return {
                    status: 500,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'PassTaskFunctionUrl environment variable is not set.'
                    }
                };
            }

            const params = new URLSearchParams({ email });

            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                context.log.error('Fetch request to PassTaskFunctionUrl timed out.');
            }, 30000); // 30 seconds timeout

            let response;
            try {
                const fullUrl = `${passTaskFunctionUrl}&${params.toString()}`;
                context.log(`Calling PassTaskFunctionUrl with: ${fullUrl}`);
                response = await fetch(fullUrl, {
                    method: 'GET',
                    signal: controller.signal
                });
            } catch (err) {
                clearTimeout(timeout);
                context.log.error('Error calling PassTaskFunctionUrl:', err);
                return {
                    status: 500,
                    jsonBody: {
                        status: 'ERROR',
                        message: 'Failed to connect to pass task service'
                    }
                };
            }
            clearTimeout(timeout);

            if (!response.ok) {
                context.log.error(`Failed to call PassTaskFunctionUrl: ${response.statusText}`);
                return {
                    status: response.status,
                    jsonBody: {
                        status: 'ERROR',
                        message: `Failed to call PassTaskFunctionUrl: ${response.statusText}`
                    }
                };
            }

            const data = await response.json();
            context.log('Response from PassTaskFunctionUrl:', data);

            return {
                status: 200,
                jsonBody: data
            };
        } catch (error) {
            context.log.error('Unhandled error in pass-task function:', error);
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
