import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class ActionsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'autofixerActions';
    private _view?: vscode.WebviewView;
    private _genAI: GoogleGenerativeAI;
    private _model: any;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _apiKey: string
    ) {
        this._genAI = new GoogleGenerativeAI(this._apiKey);
        this._model = this._genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'generateDocumentation':
                    await this._generateDocumentation();
                    break;
                case 'understandCodebase':
                    await this._understandCodebase();
                    break;
                case 'debugCode':
                    await this._debugCode();
                    break;
                case 'applySuggestion':
                    await this._applySuggestion(data.line, data.fixCode);
                    break;
                case 'ignoreSuggestion':
                    await this._ignoreSuggestion(data.line);
                    break;
            }
        });
    }

    private _getHtmlForWebview(_webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        padding: 20px;
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background: var(--vscode-editor-background);
                    }
                    .header {
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .header h2 {
                        margin: 0;
                        font-size: 1.2em;
                        color: var(--vscode-foreground);
                    }
                    .action-card {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        margin-bottom: 15px;
                        overflow: hidden;
                        transition: all 0.2s ease;
                    }
                    .action-card:hover {
                        border-color: var(--vscode-focusBorder);
                    }
                    .action-header {
                        padding: 12px 15px;
                        background: var(--vscode-editor-lineHighlightBackground);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .action-title {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    .action-content {
                        padding: 15px;
                    }
                    .button {
                        display: inline-flex;
                        align-items: center;
                        padding: 8px 16px;
                        margin: 5px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9em;
                        transition: background 0.2s ease;
                    }
                    .button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .button.secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .button.secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    .loading {
                        display: none;
                        text-align: center;
                        padding: 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .loading::after {
                        content: '';
                        display: inline-block;
                        width: 20px;
                        height: 20px;
                        margin-left: 10px;
                        border: 2px solid var(--vscode-foreground);
                        border-radius: 50%;
                        border-top-color: transparent;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    .suggestions {
                        margin-top: 20px;
                    }
                    .suggestion {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        margin-bottom: 10px;
                        overflow: hidden;
                    }
                    .suggestion-header {
                        padding: 10px 15px;
                        background: var(--vscode-editor-lineHighlightBackground);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .suggestion-content {
                        padding: 15px;
                        border-top: 1px solid var(--vscode-panel-border);
                    }
                    .suggestion-actions {
                        display: flex;
                        gap: 10px;
                        margin-top: 10px;
                    }
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.8em;
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                    }
                    .status-badge.warning {
                        background: var(--vscode-errorForeground);
                        color: var(--vscode-editor-background);
                    }
                    .status-badge.success {
                        background: var(--vscode-gitDecoration-addedResourceForeground);
                        color: var(--vscode-editor-background);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>AutoFixer Actions</h2>
                </div>
                
                <div class="action-card">
                    <div class="action-header">
                        <span class="action-title">Code Analysis</span>
                    </div>
                    <div class="action-content">
                        <button class="button" onclick="generateDocumentation()">
                            <span>Generate Documentation</span>
                        </button>
                        <button class="button" onclick="understandCodebase()">
                            <span>Understand Codebase</span>
                        </button>
                        <button class="button" onclick="debugCode()">
                            <span>Debug Code</span>
                        </button>
                    </div>
                </div>

                <div id="loading" class="loading">
                    Analyzing your code...
                </div>

                <div id="suggestions" class="suggestions"></div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function generateDocumentation() {
                        vscode.postMessage({ type: 'generateDocumentation' });
                    }
                    
                    function understandCodebase() {
                        vscode.postMessage({ type: 'understandCodebase' });
                    }
                    
                    function debugCode() {
                        vscode.postMessage({ type: 'debugCode' });
                    }
                    
                    function applySuggestion(line, fixCode) {
                        vscode.postMessage({ type: 'applySuggestion', line, fixCode });
                    }
                    
                    function ignoreSuggestion(line) {
                        vscode.postMessage({ type: 'ignoreSuggestion', line });
                    }
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'showLoading':
                                document.getElementById('loading').style.display = 'block';
                                break;
                            case 'hideLoading':
                                document.getElementById('loading').style.display = 'none';
                                break;
                            case 'showSuggestions':
                                const suggestionsDiv = document.getElementById('suggestions');
                                suggestionsDiv.innerHTML = '';
                                message.suggestions.forEach(suggestion => {
                                    const div = document.createElement('div');
                                    div.className = 'suggestion';
                                    div.innerHTML = \`
                                        <div class="suggestion-header">
                                            <span class="status-badge warning">Issue</span>
                                            <span>Line \${suggestion.line}</span>
                                        </div>
                                        <div class="suggestion-content">
                                            <div>\${suggestion.text}</div>
                                            <div class="suggestion-actions">
                                                <button class="button" onclick="applySuggestion(\${suggestion.line}, '\${suggestion.fixCode}')">
                                                    Apply Fix
                                                </button>
                                                <button class="button secondary" onclick="ignoreSuggestion(\${suggestion.line})">
                                                    Ignore
                                                </button>
                                            </div>
                                        </div>
                                    \`;
                                    suggestionsDiv.appendChild(div);
                                });
                                break;
                            case 'removeSuggestion':
                                const suggestionToRemove = document.querySelector(\`[data-line="\${message.line}"]\`);
                                if (suggestionToRemove) {
                                    suggestionToRemove.remove();
                                }
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }

    private async _generateDocumentation() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const text = editor.document.getText();
        const prompt = `Generate comprehensive documentation for this code:\n\n${text}`;

        try {
            const result = await this._model.generateContent([prompt]);
            const response = await result.response;
            const documentation = response.text();

            // Create a new file with the documentation
            const docUri = vscode.Uri.parse(`untitled:${editor.document.fileName}.md`);
            const doc = await vscode.workspace.openTextDocument(docUri);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(docUri, new vscode.Position(0, 0), documentation);
            await vscode.workspace.applyEdit(edit);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating documentation: ${error}`);
        }
    }

    private async _understandCodebase() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        // Get all TypeScript/JavaScript files in the workspace
        const files = await vscode.workspace.findFiles('**/*.{ts,js}', '**/node_modules/**');
        let codebaseContent = '';

        for (const file of files) {
            const content = await vscode.workspace.fs.readFile(file);
            codebaseContent += `\nFile: ${file.fsPath}\n${content.toString()}\n`;
        }

        const prompt = `Analyze this codebase and provide a high-level overview:\n\n${codebaseContent}`;

        try {
            const result = await this._model.generateContent([prompt]);
            const response = await result.response;
            const analysis = response.text();

            // Create a new file with the analysis
            const analysisUri = vscode.Uri.parse('untitled:codebase-analysis.md');
            const doc = await vscode.workspace.openTextDocument(analysisUri);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(analysisUri, new vscode.Position(0, 0), analysis);
            await vscode.workspace.applyEdit(edit);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Error analyzing codebase: ${error}`);
        }
    }

    private async _debugCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const text = editor.document.getText();
        const prompt = `Find and fix bugs in this code. For each fix:
        LINE_NUMBER|FIXED_CODE
        
        Example:
        10|if (value !== null && value !== undefined) {
        
        Code to analyze:
        ${text}`;

        try {
            // Show loading indicator
            this._view?.webview.postMessage({ type: 'showLoading' });

            const result = await this._model.generateContent([prompt]);
            const response = await result.response;
            const analysis = response.text();

            // Hide loading indicator
            this._view?.webview.postMessage({ type: 'hideLoading' });

            // Parse suggestions
            const suggestions = [];
            const lines = analysis.split('\n');
            for (const line of lines) {
                if (line.includes('Line')) {
                    const lineNum = parseInt(line.match(/Line (\d+)/)?.[1] || '0');
                    if (lineNum > 0) {
                        suggestions.push({
                            line: lineNum,
                            text: line,
                            fixCode: line // Placeholder, replace with actual fix code
                        });
                    }
                }
            }

            // Send suggestions to webview
            this._view?.webview.postMessage({ type: 'showSuggestions', suggestions });
        } catch (error) {
            vscode.window.showErrorMessage(`Error debugging code: ${error}`);
            this._view?.webview.postMessage({ type: 'hideLoading' });
        }
    }

    private async _applySuggestion(line: number, fixCode: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const range = new vscode.Range(
            new vscode.Position(line - 1, 0),
            new vscode.Position(line - 1, editor.document.lineAt(line - 1).text.length)
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(range, fixCode);
        });
    }

    private async _ignoreSuggestion(line: number) {
        // Optionally, you can remove the suggestion from the webview
        this._view?.webview.postMessage({ type: 'removeSuggestion', line });
    }
} 