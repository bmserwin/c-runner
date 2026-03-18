const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

app.post('/run', (req, res) => {
    const { code, input = "" } = req.body;

    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    const id = uuidv4();
    const sourceFile = path.join(tempDir, `${id}.c`);
    const outputFile = path.join(tempDir, `${id}.out`);

    // 1. Write the code to a file
    fs.writeFile(sourceFile, code, (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to create source file" });
        }

        const startTime = performance.now();

        // 2. Compile the C code
        exec(`gcc "${sourceFile}" -o "${outputFile}"`, (compileError, stdout, stderr) => {
            if (compileError) {
                // Cleanup source file
                fs.unlinkSync(sourceFile);
                return res.json({ error: stderr || "Compilation failed" });
            }

            // 3. Execute the compiled program
            const child = spawn(outputFile);
            let responseOutput = "";
            let responseError = "";
            let killed = false;

            // Handle timeout for infinite loops
            const timeout = setTimeout(() => {
                child.kill();
                killed = true;
            }, 5000); // 5 second timeout

            // Handle stdin if provided
            if (input) {
                child.stdin.write(input);
                child.stdin.end();
            }

            child.stdout.on('data', (data) => {
                responseOutput += data.toString();
            });

            child.stderr.on('data', (data) => {
                responseError += data.toString();
            });

            child.on('close', (code) => {
                clearTimeout(timeout);
                const endTime = performance.now();
                const executionTime = (endTime - startTime).toFixed(2);

                // Cleanup files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

                if (killed) {
                    return res.json({ error: "Execution timed out (5s)" });
                }

                if (code !== 0 && !responseOutput) {
                    return res.json({ error: responseError || `Program exited with code ${code}` });
                }

                res.json({
                    output: responseOutput,
                    error: responseError,
                    executionTime: `${executionTime}ms`
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
