const express = require('express');
const path = require('path');
const { Session } = require('e2b'); // E2B SDK import
const fs = require('fs').promises; // For reading script file
// const { exec } = require('child_process'); // Kept for potential future use

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/submit', async (req, res) => {
    const { geminiApiKey, e2bApiKey, githubUrl, githubApiKey, taskDescription } = req.body;

    // Mask API keys for logging
    const maskedBody = { ...req.body };
    if (maskedBody.geminiApiKey) maskedBody.geminiApiKey = '***GEMINI_API_KEY***';
    if (maskedBody.e2bApiKey) maskedBody.e2bApiKey = '***E2B_API_KEY***';
    if (maskedBody.githubApiKey) maskedBody.githubApiKey = '***GITHUB_API_KEY***';
    console.log('Received data for /api/submit:', maskedBody);

    if (!geminiApiKey || !e2bApiKey || !githubUrl || !githubApiKey || !taskDescription) {
        return res.status(400).json({ error: 'Missing required fields. Please fill out all inputs.' });
    }
    try {
        const url = new URL(githubUrl);
        if (url.hostname !== 'github.com') throw new Error('Invalid hostname.');
    } catch (error) {
        return res.status(400).json({ error: 'Invalid GitHub Repository URL format. Example: https://github.com/user/repo' });
    }

    let session;
    try {
        console.log('Reading E2B script content from e2b_script_content.sh...');
        const e2bScript = await fs.readFile('e2b_script_content.sh', 'utf-8');
        console.log('E2B script content read successfully.');

        console.log('Attempting to connect to E2B sandbox...');
        session = await Session.create({
            id: 'Nodejs', // Ensure this E2B environment ID is correct and has bash, git, gh, curl, jq.
            apiKey: e2bApiKey,
        });
        console.log(`E2B session created successfully with ID: ${session.id}`);

        const envVars = {
            GEMINI_API_KEY: geminiApiKey,
            TASK_DESCRIPTION: taskDescription,
            GITHUB_REPO_URL: githubUrl,
            GITHUB_API_KEY: githubApiKey
        };
        // Log env vars without actual keys for security
        const maskedEnvVars = { ...envVars };
        maskedEnvVars.GEMINI_API_KEY = '***GEMINI_API_KEY_MASKED***';
        maskedEnvVars.GITHUB_API_KEY = '***GITHUB_API_KEY_MASKED***';
        console.log('Preparing to execute E2B script with ENV_VARS:', JSON.stringify(maskedEnvVars));

        console.log('Uploading script to E2B sandbox...');
        await session.filesystem.write('e2b_script_content.sh', e2bScript);
        console.log('Script uploaded. Starting execution...');

        const execution = await session.process.start({
            cmd: 'bash e2b_script_content.sh',
            envVars: envVars,
            onStdout: (data) => console.log(`[E2B STDOUT]: ${data.line}`),
            onStderr: (data) => console.warn(`[E2B STDERR]: ${data.line}`),
        });

        console.log('Waiting for E2B script execution to complete...');
        await execution.wait();
        console.log(`E2B script finished with exit code: ${execution.exitCode}.`);

        if (execution.exitCode !== 0) {
            const errorOutput = execution.stderr.map(data => data.line).join('\n'); // Corrected: .map(data => data.line)
            console.error(`E2B script execution failed. Stderr: ${errorOutput}`);
            throw new Error(`E2B script execution failed with exit code ${execution.exitCode}. Details: ${errorOutput || 'No stderr output.'}`);
        }

        const prUrl = execution.stdout.map(data => data.line).filter(line => line.trim().startsWith('http')).pop()?.trim(); // Corrected: .map(data => data.line)

        if (!prUrl) {
            const allStdout = execution.stdout.map(data => data.line).join('\n'); // Corrected: .map(data => data.line)
            console.error(`E2B script finished, but PR URL was not found in stdout. Stdout: ${allStdout}`);
            throw new Error('E2B script finished successfully, but could not parse PR URL from output. Please check E2B logs.');
        }

        console.log('E2B script executed successfully. PR URL:', prUrl);
        res.status(200).json({ pr_url: prUrl, status: "Done! PR Created successfully." });

    } catch (error) {
        console.error('Overall E2B interaction or processing failed:', error);
        res.status(500).json({ error: `Operation failed: ${error.message}` });
    } finally {
        if (session) {
            console.log('Closing E2B session...');
            await session.close();
            console.log('E2B session closed.');
        }
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`UI available at http://localhost:${port}/home`);
});
