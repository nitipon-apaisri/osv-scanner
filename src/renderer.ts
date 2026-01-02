/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import "./index.css";

// Type definitions for the exposed API
declare global {
    interface Window {
        electronAPI: {
            selectFolder: () => Promise<string | null>;
            scanFolder: (folderPath: string) => Promise<{
                success: boolean;
                exitCode: number | null;
                stdout: string;
                stderr: string;
                error?: string;
            }>;
        };
    }
}

// Get DOM elements
const uploadArea = document.getElementById("uploadArea") as HTMLElement;
const selectedFolder = document.getElementById("selectedFolder") as HTMLElement;
const folderPath = document.getElementById("folderPath") as HTMLElement;
const changeFolderBtn = document.getElementById("changeFolderBtn") as HTMLButtonElement;
const scanBtn = document.getElementById("scanBtn") as HTMLButtonElement;

let selectedFolderPath: string | null = null;

// Function to handle folder selection
async function selectFolder() {
    try {
        const path = await window.electronAPI.selectFolder();
        if (path) {
            selectedFolderPath = path;
            folderPath.textContent = path;
            selectedFolder.style.display = "flex";
            scanBtn.disabled = false;
        }
    } catch (error) {
        console.error("Error selecting folder:", error);
        alert("Failed to select folder. Please try again.");
    }
}

// Click handler for upload area
uploadArea.addEventListener("click", selectFolder);

// Click handler for change folder button
changeFolderBtn.addEventListener("click", selectFolder);

// Drag and drop handlers
uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove("dragover");

    // Note: Electron's drag and drop doesn't directly support folders
    // So we'll fall back to the dialog
    selectFolder();
});

// Scan button handler
scanBtn.addEventListener("click", async () => {
    if (!selectedFolderPath) return;

    // Disable button and show loading state
    scanBtn.disabled = true;
    const originalText = scanBtn.textContent;
    scanBtn.textContent = "Scanning...";

    // hide the results container
    const resultsContainer = document.getElementById("scanResults");
    if (resultsContainer) {
        resultsContainer.style.display = "none";
    }

    try {
        const result = await window.electronAPI.scanFolder(selectedFolderPath);

        // Display results
        displayScanResults(result);
    } catch (error) {
        console.error("Error scanning folder:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        displayScanResults({
            success: false,
            exitCode: null,
            stdout: "",
            stderr: "",
            error: errorMessage,
        });
    } finally {
        // Re-enable button
        scanBtn.disabled = false;
        scanBtn.textContent = originalText || "Scan Folder";
    }
});

function displayScanResults(result: { success: boolean; exitCode: number | null; stdout: string; stderr: string; error?: string }) {
    // Get or create results container
    let resultsContainer = document.getElementById("scanResults");
    if (!resultsContainer) {
        resultsContainer = document.createElement("div");
        resultsContainer.id = "scanResults";
        resultsContainer.className = "scan-results";
        document.querySelector(".container")?.appendChild(resultsContainer);
    }

    const output = result.stdout || result.stderr || result.error || "No output";
    const isSuccess = result.success;

    resultsContainer.innerHTML = `
    <div class="results-header">
      <h3>${isSuccess ? "✅ No vulnerabilities found" : "❌ Vulnerabilities found"}</h3>
      ${result.exitCode !== null ? `<span class="exit-code">Exit Code: ${result.exitCode}</span>` : ""}
    </div>
    <div class="results-content ${isSuccess ? "success" : "error"}">
      <pre>${escapeHtml(output)}</pre>
    </div>
  `;

    resultsContainer.style.display = "block";

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
