# AI Agent Task Submitter

This Node.js application provides a web interface to submit tasks that are then processed by an AI agent running in an E2B (e2b.dev) sandbox. The agent uses Google's Gemini API to generate text content and then creates a GitHub Pull Request with this content.

## Features

- Web UI to input API keys, GitHub repository details, and a task description.
- Securely passes credentials to an E2B sandbox using the `@e2b/code-interpreter` SDK.
- Uses Gemini API (gemini-1.5-flash) via cURL to generate text based on the task.
- Clones a GitHub repository, creates a new branch, adds the generated file, commits, and pushes.
- Creates a Pull Request using the `gh` CLI.
- Displays the resulting Pull Request URL in the UI.

## Prerequisites

Before you begin, ensure you have the following:

1.  **Node.js and npm:** Download and install from [nodejs.org](https://nodejs.org/). The application relies on dependencies listed in `package.json` (like `express`, `@e2b/code-interpreter`, `dotenv`), which `npm install` will handle.
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
    This command will install all necessary packages defined in `package.json`, including Express, `@e2b/code-interpreter`, and `dotenv`.
    ```bash
    npm install
    ```

3.  **(Optional) Create a `.env` file:**
    For local development, you can create a `.env` file in the root of the project to store your API keys. This file is ignored by Git (if `.env` is added to `.gitignore`). `server.js` is not currently set up to automatically load it with `dotenv`, but it's a common practice if you wish to extend the server for local key management. The application currently expects keys to be entered via the UI.

## Configuration

### E2B Sandbox Environment and Tools

The application uses the `@e2b/code-interpreter` SDK to execute the AI agent script. In `server.js`, the sandbox is initialized as follows:

```javascript
// At the top of server.js:
const { Sandbox } = require('@e2b/code-interpreter');

// In server.js, inside the /api/submit route:
session = await Sandbox.create({
    apiKey: e2bApiKey
});
```

-   **Critical Note:** The `Sandbox.create({ apiKey: e2bApiKey })` call uses the default environment provided by the `@e2b/code-interpreter` SDK. You **must** ensure this default environment contains all necessary tools for `e2b_script_content.sh` to run:
    *   `bash`
    *   `git`
    *   `gh` (GitHub CLI)
    *   `curl`
    *   `jq`
-   If the default E2B sandbox environment does **not** include these tools, the script will fail. In such a case, you would need to:
    *   Modify `e2b_script_content.sh` to install these tools at the beginning of its execution (e.g., using `apt-get update && apt-get install -y git gh curl jq`). This will increase the script's runtime.
    *   Alternatively, if `@e2b/code-interpreter` allows specifying a custom environment ID or template that has these tools pre-installed (check E2B documentation for advanced `Sandbox.create` options), you would use that. The current code uses the simplest `Sandbox.create` form.

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
2.  The Node.js Express server (`server.js`) receives this information at the `/api/submit` endpoint. It uses the `@e2b/code-interpreter` SDK.
3.  The server securely passes the necessary credentials and task description as environment variables to an E2B `Sandbox` instance.
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
-   **E2B Sandbox Logs:** Check the E2B dashboard for logs related to your sandbox sessions for more in-depth debugging of the script execution. This is crucial for diagnosing issues within `e2b_script_content.sh`.
-   **API Key Permissions:** Ensure your Gemini API key is enabled and your GitHub PAT has the correct permissions (`repo`).
-   **E2B Default Environment Tools:** As highlighted in the "Configuration" section, verify that the default E2B sandbox for `@e2b/code-interpreter` includes `git`, `gh`, `curl`, and `jq`. If not, the script will fail. You may need to add installation commands to the script or explore options for using a custom E2B environment template.
```
