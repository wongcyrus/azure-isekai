# Student Registration API Setup

This document explains how to set up the Student Registration API in the Azure Isekai project.

## Files Added

1. **`/api/src/functions/registration.js`** - Azure Function that proxies requests to the StudentRegistrationFunction
2. **`/registration.html`** - User-friendly registration form interface

## Configuration Required

### Environment Variables

You need to add the following environment variable to your Azure Function App configuration or local.settings.json:

```json
{
  "Values": {
    "StudentRegistrationFunctionUrl": "https://your-grader-function-app.azurewebsites.net/api/StudentRegistrationFunction"
  }
}
```

### Local Development

For local development, create or update your `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "StudentRegistrationFunctionUrl": "http://localhost:7071/api/StudentRegistrationFunction"
  }
}
```

## Usage

### API Access

- **POST** `/api/registration` - Processes registration form submission

### Web Interface

Navigate to `/registration.html` for the registration interface that:
- Automatically detects the user's email from authentication headers
- Allows users to enter their Azure credentials
- Validates JSON format of Azure credentials
- Provides visual feedback during registration
- Displays success/error messages

### Integration with Main Game

You can link to the registration page from your main game interface:

```html
<a href="/registration.html">Register for Azure Isekai</a>
```

## Features

### API Function (`registration.js`)
- Accepts POST requests to process registration form submissions
- **Authentication Check**: Validates that the user is authenticated before processing
- Automatically extracts user email from Azure Static Web Apps authentication headers
- Returns 401 error with login redirect if user is not authenticated
- Adds the authenticated user's email to the form data before proxying
- Proxies form data to StudentRegistrationFunction
- Handles timeouts and error responses
- Returns HTML response from the original function

### Registration Form (`registration.html`)
- Modern, responsive design for authenticated users
- Automatic email detection (no manual input required)
- Real-time JSON validation for Azure credentials
- Loading states and error handling
- Auto-resizing textarea for credentials
- Example format display for required JSON structure

## Security Notes

- **All API functions** require user authentication through Azure Static Web Apps
- If a user is not authenticated (email = 'unknown'), requests are rejected with HTTP 401
- **Registration API**: Returns HTML error page with login redirect
- **Grader & Game Task APIs**: Return JSON error response with authentication message
- Form validation ensures required fields are provided
- JSON credentials are validated client-side before submission
- All requests are proxied through Azure Functions for security
- Email comes directly from authentication headers (no user input manipulation)

## Testing

1. Start your local Azure Functions development server
2. Navigate to `http://localhost:7071/registration.html` (ensure you are authenticated)
3. Enter your Azure service principal credentials (email is automatically detected)
4. Submit the form to test the registration flow

The registration will be processed by the original StudentRegistrationFunction through the proxy, with the email automatically extracted from your authentication context.
