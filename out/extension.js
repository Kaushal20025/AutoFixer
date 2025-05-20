"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const generative_ai_1 = require("@google/generative-ai");
async function activate(context) {
    const config = vscode.workspace.getConfiguration('codeAnalyzerPro');
    const apiKey = config.get('apiKey') || 'AIzaSyDaI0d-1WAw7BRO25JElIOgEMgzoNMCHh0';
    if (!apiKey) {
        vscode.window.showWarningMessage('Please set your Gemini API key in settings');
        return;
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    let analyzeCode = vscode.commands.registerCommand('code-analyzer-pro.analyzeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const document = editor.document;
        const text = document.getText();
        try {
            vscode.window.showInformationMessage('Analyzing code...');
            const result = await model.generateContent([
                'Analyze this code and provide insights about its structure, potential improvements, and best practices:',
                text
            ]);
            const response = await result.response;
            const analysis = response.text();
            // Create and show a new webview panel
            const panel = vscode.window.createWebviewPanel('codeAnalysis', 'Code Analysis', vscode.ViewColumn.Beside, { enableScripts: true });
            panel.webview.html = getWebviewContent(analysis);
            vscode.window.showInformationMessage('Analysis complete!');
        }
        catch (error) {
            vscode.window.showErrorMessage('Error analyzing code: ' + error);
            console.error('Analysis error:', error);
        }
    });
    let generateDocs = vscode.commands.registerCommand('code-analyzer-pro.generateDocs', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const document = editor.document;
        const text = document.getText();
        try {
            vscode.window.showInformationMessage('Generating documentation...');
            const result = await model.generateContent([
                'Generate comprehensive documentation for this code, including function descriptions, parameters, return values, and usage examples:',
                text
            ]);
            const response = await result.response;
            const docs = response.text();
            // Get the workspace folder
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }
            // Create documentation directory path
            const docDirPath = vscode.Uri.joinPath(workspaceFolder.uri, 'documentation');
            // Create documentation directory if it doesn't exist
            try {
                await vscode.workspace.fs.createDirectory(docDirPath);
            }
            catch (error) {
                // Directory might already exist, which is fine
                console.log('Documentation directory might already exist:', error);
            }
            // Create documentation file path
            const fileName = document.fileName.split(/[\/\\]/).pop()?.replace(/\.[^/.]+$/, '') || 'documentation';
            const docFilePath = vscode.Uri.joinPath(docDirPath, `${fileName}.md`);
            // Write documentation to file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(docFilePath, encoder.encode(docs));
            vscode.window.showInformationMessage('Documentation generated successfully!');
            // Open the generated documentation file
            const docFile = await vscode.workspace.openTextDocument(docFilePath);
            await vscode.window.showTextDocument(docFile, vscode.ViewColumn.Beside);
        }
        catch (error) {
            vscode.window.showErrorMessage('Error generating documentation: ' + error);
            console.error('Documentation error:', error);
        }
    });
    context.subscriptions.push(analyzeCode, generateDocs);
}
function getWebviewContent(analysis) {
    return `<!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    padding: 20px; 
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }
                pre { 
                    background-color: #f5f5f5; 
                    padding: 15px; 
                    border-radius: 5px;
                    overflow-x: auto;
                }
                h2 {
                    color: #2c3e50;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <h2>Code Analysis</h2>
            <pre>${analysis}</pre>
        </body>
    </html>`;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map