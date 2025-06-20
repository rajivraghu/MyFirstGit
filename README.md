# AI Agent Task Submitter

This Node.js application provides a web interface to submit tasks that are then processed by an AI agent running in an E2B (e2b.dev) sandbox. The agent uses Google's Gemini API to generate text content and then creates a GitHub Pull Request with this content.

## Features

- Web UI to input API keys, GitHub repository details, and a task description.
- Securely passes credentials to an E2B sandbox.
- Uses Gemini API (gemini-1.5-flash) via cURL to generate text based on the task.
- Clones a GitHub repository, creates a new branch, adds the generated file, commits, and pushes.
- Creates a Pull Request using the `gh` CLI.
- Displays the resulting Pull Request URL in the UI.

## Prerequisites

Before you begin, ensure you have the following:

1.  **Node.js and npm:** Download and install from [nodejs.org](https://nodejs.org/).
2.  **E2B Account and API Key:**
    *   Sign up at [e2b.dev](https://e2b.dev/).
    *   Obtain your E2B API Key from your account settings.
3.  **Gemini API Key:**
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey) (or Google Cloud Console).
    *   Create an API key for the Gemini API.
4.  **GitHub Personal Access Token (PAT):**
    *   Go to your GitHub [Developer settings](https://github.com/settings/tokens).
    *   Generate a new token (classic or fine-grained).
    *   **Required permissions for the token**:
        *   `repo` (Full control of private repositories) - for cloning, pushing, creating PRs.
        *   If using fine-grained tokens, ensure it has read/write access to code and pull requests for the target repositories.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

### E2B Environment ID

The application uses an E2B sandbox to execute the AI agent script. In `server.js`, the following line specifies the E2B environment:

```javascript
// In server.js, inside the /api/submit route:
session = await Session.create({
    id: 'Nodejs', // <-- IMPORTANT: Verify/Change this ID
    apiKey: e2bApiKey,
});
```

-   The `id: 'Nodejs'` is a placeholder. You **must** ensure this ID corresponds to a valid E2B environment template that has `bash`, `git`, `gh` (GitHub CLI), `curl`, and `jq` installed and available in the PATH.
-   If your chosen E2B template does not include these tools, you will need to:
    *   Modify the `e2b_script_content.sh` to install them at the beginning.
    *   Or, create a custom E2B environment with these tools pre-installed.
    *   Update the `id` in `server.js` to your custom environment ID if applicable.

## Running the Application

1.  **Start the server:**
    ```bash
    node server.js
    ```

2.  **Access the UI:**
    Open your web browser and navigate to:
    `http://localhost:3000/home`
    (The port may vary if `PORT` environment variable is set).

3.  **Submit a task:**
    - Fill in your Gemini API Key, E2B API Key, the target GitHub Repository URL (e.g., `https://github.com/your-username/your-repo`), your GitHub PAT, and a description of the task for Gemini.
    - Click "Submit Task".
    - Wait for the process to complete. The status and PR URL will be displayed.

## How it Works

1.  The user submits API keys and task details via the web UI (`public/index.html`).
2.  The Node.js Express server (`server.js`) receives this information at the `/api/submit` endpoint.
3.  The server securely passes the necessary credentials and task description as environment variables to an E2B sandbox session.
4.  Inside the E2B sandbox, the `e2b_script_content.sh` script is executed:
    *   It calls the Gemini API with the task description to generate text.
    *   It uses `git` and `gh` CLI (authenticated with the GitHub PAT) to:
        *   Clone the specified repository.
        *   Create a new branch.
        *   Add the Gemini-generated content as a new file.
        *   Commit and push the new branch.
        *   Create a pull request.
    *   The script outputs the URL of the newly created pull request.
5.  `server.js` captures this PR URL from the E2B script's output.
6.  The PR URL and a success status are sent back to the client's browser and displayed.

## Troubleshooting

-   **Check Server Logs:** The `node server.js` console output will contain detailed logs, including (masked) inputs, E2B interaction steps, and any errors from the E2B script (stdout/stderr).
-   **E2B Sandbox Logs:** Check the E2B dashboard for logs related to your sandbox sessions for more in-depth debugging of the script execution.
-   **API Key Permissions:** Ensure your Gemini API key is enabled and your GitHub PAT has the correct permissions.
-   **E2B Environment:** Double-check that the E2B environment specified by the `id` in `server.js` has all the required tools (`git`, `gh`, `curl`, `jq`).
```
