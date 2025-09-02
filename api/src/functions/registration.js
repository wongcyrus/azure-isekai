const { app } = require('@azure/functions');

app.http('registration', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            context.log('HTTP POST /registration called');

            const studentRegistrationFunctionUrl = process.env.StudentRegistrationFunctionUrl;
            context.log(`StudentRegistrationFunctionUrl: ${studentRegistrationFunctionUrl}`);
            
            if (!studentRegistrationFunctionUrl) {
                context.log.error('StudentRegistrationFunctionUrl environment variable is not set.');
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    jsonBody: {
                        status: 'ERROR',
                        message: 'StudentRegistrationFunctionUrl environment variable is not set.'
                    }
                };
            }

            // Handle POST request - proxy the form submission
            const formData = await request.formData();
            context.log('Processing POST registration request');

            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                context.log.error('POST request to StudentRegistrationFunctionUrl timed out.');
            }, 60000); // 60 seconds timeout for registration processing

            let response;
            try {
                context.log(`Calling StudentRegistrationFunctionUrl POST: ${studentRegistrationFunctionUrl}`);
                response = await fetch(studentRegistrationFunctionUrl, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
            } catch (err) {
                clearTimeout(timeout);
                context.log.error('Error calling StudentRegistrationFunctionUrl POST:', err);
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    jsonBody: {
                        status: 'ERROR',
                        message: 'Failed to connect to registration service'
                    }
                };
            }
            clearTimeout(timeout);

            if (!response.ok) {
                context.log.error(`Failed to call StudentRegistrationFunctionUrl POST: ${response.statusText}`);
                return {
                    status: response.status,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    jsonBody: {
                        status: 'ERROR',
                        message: `Failed to call StudentRegistrationFunctionUrl: ${response.statusText}`
                    }
                };
            }

            const result = await response.text();
            context.log('Registration response:', result);

            // Return the result as HTML (since the original function returns HTML)
            return {
                status: 200,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: result
            };

        } catch (error) {
            context.log.error('Unhandled error in registration function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    status: 'ERROR',
                    message: 'Internal server error occurred'
                }
            };
        }
    }
});
