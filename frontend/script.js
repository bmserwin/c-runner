// Initialize Ace Editor
const editor = ace.edit("editor");
editor.setTheme("ace/theme/one_dark");
editor.session.setMode("ace/mode/c_cpp");
editor.setOptions({
    fontSize: "14pt",
    showPrintMargin: false,
    showGutter: true,
    highlightActiveLine: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    tabSize: 4,
    useSoftTabs: true
});

// UI Elements
const runBtn = document.getElementById('runBtn');
const terminal = document.getElementById('terminal');
const timeBadge = document.getElementById('time-badge');
const stdinArea = document.getElementById('stdin');

// State
let isRunning = false;

// Handle Run Button Click
runBtn.addEventListener('click', async () => {
    if (isRunning) return;

    const code = editor.getValue();
    const input = stdinArea.value;

    if (!code.trim()) {
        updateTerminal("Please write some code before running...", "error");
        return;
    }

    setRunningState(true);
    updateTerminal("Compiling and executing code...", "info");
    timeBadge.innerText = "";

    try {
        const response = await fetch('/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, input })
        });

        const data = await response.json();

        if (data.error) {
            updateTerminal(data.error, "error");
        } else {
            updateTerminal(data.output || "Program executed successfully with no output.", "success");
            if (data.executionTime) {
                timeBadge.innerText = `[${data.executionTime}]`;
            }
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        updateTerminal("Network error: Could not reach the server. Make sure the backend is running.", "error");
    } finally {
        setRunningState(false);
    }
});

function setRunningState(state) {
    isRunning = state;
    if (state) {
        runBtn.classList.add('running');
        runBtn.innerHTML = '<span class="icon">⌛</span> Processing...';
        runBtn.disabled = true;
    } else {
        runBtn.classList.remove('running');
        runBtn.innerHTML = '<span class="icon">▶</span> Run Code';
        runBtn.disabled = false;
    }
}

function updateTerminal(message, type = "info") {
    terminal.innerHTML = "";
    const span = document.createElement("span");

    if (type === "error") {
        span.className = "error-msg";
        span.innerText = "❌ ERROR:\n" + message;
    } else if (type === "success") {
        span.className = "success-msg";
        span.innerText = message;
    } else {
        span.className = "info-msg";
        span.innerText = message;
    }

    terminal.appendChild(span);
}

// Add some demo code on load
window.addEventListener('DOMContentLoaded', () => {
    // Already set in HTML, but can be updated here
});
