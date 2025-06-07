"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const generative_ai_1 = require("@google/generative-ai");
const path = require("path");
async function activate(context) {
    try {
        console.log('AutoFixer is now active!');
        const config = vscode.workspace.getConfiguration('codeAnalyzerPro');
        const apiKey = config.get('apiKey');
        if (!apiKey) {
            vscode.window.showErrorMessage('Please set your Gemini API key in settings');
            return;
        }
        console.log('Initializing Gemini AI...');
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Create diagnostic collection for code issues
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('codeAnalyzerPro');
        context.subscriptions.push(diagnosticCollection);
        // Initialize the tree view
        const treeDataProvider = new AnalysisTreeDataProvider();
        const treeView = vscode.window.createTreeView('autofixerSuggestions', {
            treeDataProvider,
            showCollapseAll: true
        });
        context.subscriptions.push(treeView);
        // Function to analyze a single file
        async function analyzeFile(document) {
            const text = document.getText();
            console.log('Analyzing file:', document.fileName);
            const prompt = `Analyze this code and provide comprehensive suggestions. For each issue:
            LINE_NUMBER|ISSUE_TYPE|SEVERITY|CATEGORY|DESCRIPTION|FIXED_CODE
            
            Issue types: error, warning, info
            Categories: performance, security, style, bug, best-practice
            
            Example:
            5|error|high|security|Potential SQL injection|const query = db.escape(userInput);
            
            Focus on:
            - Performance optimizations
            - Security vulnerabilities
            - Code style and best practices
            - Potential bugs
            - Memory leaks
            - Resource management
            - Error handling
            - Type safety
            - Documentation
            
            Code to analyze:
            ${text}`;
            const result = await model.generateContent([prompt]);
            const response = await result.response;
            const analysis = response.text();
            const suggestions = parseSuggestions(analysis);
            const summary = generateSummary(suggestions);
            return {
                filePath: document.fileName,
                suggestions,
                summary
            };
        }
        // Function to analyze entire codebase
        async function analyzeCodebase() {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            const analyses = [];
            for (const folder of workspaceFolders) {
                const files = await vscode.workspace.findFiles('**/*.{py,js,ts,java,cpp,c,cs}', '**/node_modules/**');
                for (const file of files) {
                    const document = await vscode.workspace.openTextDocument(file);
                    const analysis = await analyzeFile(document);
                    analyses.push(analysis);
                }
            }
            treeDataProvider.updateAnalyses(analyses);
        }
        // Register commands
        context.subscriptions.push(vscode.commands.registerCommand('autofixer.analyzeFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const analysis = await analyzeFile(editor.document);
                treeDataProvider.updateAnalyses([analysis]);
                // Show the tree view
                treeView.reveal(new FileItem(analysis.filePath, analysis, 'summary'), { focus: true });
            }
        }), vscode.commands.registerCommand('autofixer.analyzeCodebase', async () => {
            await analyzeCodebase();
        }), vscode.commands.registerCommand('autofixer.applySuggestion', async (suggestion) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            const edit = new vscode.WorkspaceEdit();
            const line = editor.document.lineAt(suggestion.line - 1);
            const range = new vscode.Range(new vscode.Position(suggestion.line - 1, 0), new vscode.Position(suggestion.line - 1, line.text.length));
            edit.replace(editor.document.uri, range, suggestion.fixCode);
            await vscode.workspace.applyEdit(edit);
        }), vscode.commands.registerCommand('autofixer.applyAllFixes', async (filePath) => {
            const analysis = treeDataProvider.getAnalysis(filePath);
            if (!analysis) {
                vscode.window.showErrorMessage('No analysis found for this file');
                return;
            }
            const document = await vscode.workspace.openTextDocument(filePath);
            const edit = new vscode.WorkspaceEdit();
            for (const suggestion of analysis.suggestions) {
                const line = document.lineAt(suggestion.line - 1);
                const range = new vscode.Range(new vscode.Position(suggestion.line - 1, 0), new vscode.Position(suggestion.line - 1, line.text.length));
                edit.replace(document.uri, range, suggestion.fixCode);
            }
            await vscode.workspace.applyEdit(edit);
            vscode.window.showInformationMessage(`Applied ${analysis.suggestions.length} fixes to ${path.basename(filePath)}`);
        }), vscode.commands.registerCommand('autofixer.showSummary', () => {
            treeDataProvider.setCurrentTab('summary');
        }), vscode.commands.registerCommand('autofixer.showSuggestions', () => {
            treeDataProvider.setCurrentTab('suggestions');
        }), vscode.commands.registerCommand('autofixer.showLineByLine', () => {
            treeDataProvider.setCurrentTab('lineByLine');
        }));
        // Add file open event handler
        context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async (document) => {
            if (document.languageId) {
                const analysis = await analyzeFile(document);
                treeDataProvider.updateAnalyses([analysis]);
            }
        }));
        // Add file change event handlers
        context.subscriptions.push(
        // Reanalyze when switching between files
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && editor.document.languageId) {
                const analysis = await analyzeFile(editor.document);
                treeDataProvider.updateAnalyses([analysis]);
            }
        }), 
        // Reanalyze when file content changes
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document && event.document.languageId) {
                const analysis = await analyzeFile(event.document);
                treeDataProvider.updateAnalyses([analysis]);
            }
        }), 
        // Reanalyze when saving a file
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (document.languageId) {
                const analysis = await analyzeFile(document);
                treeDataProvider.updateAnalyses([analysis]);
            }
        }));
        // Initial analysis of open files
        vscode.window.visibleTextEditors.forEach(async (editor) => {
            if (editor.document.languageId) {
                const analysis = await analyzeFile(editor.document);
                treeDataProvider.updateAnalyses([analysis]);
            }
        });
    }
    catch (error) {
        console.error('Extension activation error:', error);
        vscode.window.showErrorMessage(`Error activating extension: ${error}`);
    }
}
function parseSuggestions(analysis) {
    console.log('Parsing suggestions from:', analysis);
    const suggestions = [];
    if (!analysis || typeof analysis !== 'string') {
        console.error('Invalid analysis response:', analysis);
        return suggestions;
    }
    const lines = analysis.split('\n');
    for (const line of lines) {
        if (!line.trim())
            continue;
        const parts = line.split('|');
        if (parts.length === 6) {
            const [lineNum, type, severity, category, description, fixCode] = parts;
            const lineNumber = parseInt(lineNum);
            if (!isNaN(lineNumber) && lineNumber > 0) {
                suggestions.push({
                    line: lineNumber,
                    type: type.trim(),
                    text: description.trim(),
                    fixCode: fixCode.trim(),
                    severity: severity.trim(),
                    category: category.trim()
                });
            }
        }
    }
    return suggestions;
}
function generateSummary(suggestions) {
    const counts = {
        error: 0,
        warning: 0,
        info: 0,
        performance: 0,
        security: 0,
        style: 0,
        bug: 0,
        'best-practice': 0
    };
    suggestions.forEach(s => {
        counts[s.severity]++;
        counts[s.category]++;
    });
    return `${suggestions.length} issues found: ${counts.error} errors, ${counts.warning} warnings, ${counts.info} info. ` +
        `Categories: ${counts.performance} performance, ${counts.security} security, ${counts.style} style, ` +
        `${counts.bug} bugs, ${counts['best-practice']} best practices`;
}
class AnalysisTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.analyses = new Map();
        this.currentTab = 'summary';
    }
    updateAnalyses(newAnalyses) {
        newAnalyses.forEach(analysis => {
            this.analyses.set(analysis.filePath, analysis);
        });
        this._onDidChangeTreeData.fire();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setCurrentTab(tab) {
        this.currentTab = tab;
        this._onDidChangeTreeData.fire();
    }
    getAnalysis(filePath) {
        return this.analyses.get(filePath);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level: Show tabs and current file
            const items = [
                new TabHeaderItem(this.currentTab),
                new SeparatorItem('')
            ];
            // Add current file analysis
            const currentFile = vscode.window.activeTextEditor?.document.fileName;
            if (currentFile) {
                const analysis = this.analyses.get(currentFile);
                if (analysis) {
                    items.push(new FileItem(currentFile, analysis, this.currentTab));
                }
            }
            return items;
        }
        else if (element instanceof FileItem) {
            // File level: Show content based on current tab
            const analysis = this.analyses.get(element.filePath);
            if (!analysis)
                return [];
            switch (this.currentTab) {
                case 'summary':
                    return [new SummaryItem(analysis.summary)];
                case 'suggestions':
                    return this.getSuggestionItems(analysis);
                case 'lineByLine':
                    return this.getLineByLineItems(analysis);
                default:
                    return [];
            }
        }
        return [];
    }
    getSuggestionItems(analysis) {
        const items = [];
        const categories = new Map();
        // Group suggestions by category
        analysis.suggestions.forEach(s => {
            if (!categories.has(s.category)) {
                categories.set(s.category, []);
            }
            categories.get(s.category).push(s);
        });
        // Add category headers and suggestions
        categories.forEach((suggestions, category) => {
            items.push(new CategoryHeaderItem(category));
            suggestions.forEach(suggestion => {
                items.push(new SuggestionItem(analysis.filePath, suggestion));
            });
            items.push(new SeparatorItem(''));
        });
        return items;
    }
    getLineByLineItems(analysis) {
        const items = [];
        const lineMap = new Map();
        // Group suggestions by line number
        analysis.suggestions.forEach(s => {
            if (!lineMap.has(s.line)) {
                lineMap.set(s.line, []);
            }
            lineMap.get(s.line).push(s);
        });
        // Sort by line number
        const sortedLines = Array.from(lineMap.keys()).sort((a, b) => a - b);
        sortedLines.forEach(line => {
            const suggestions = lineMap.get(line);
            items.push(new LineItem(analysis.filePath, line, suggestions));
        });
        return items;
    }
}
class TabHeaderItem extends vscode.TreeItem {
    constructor(currentTab) {
        super('🔍 AutoFixer - Code Analysis');
        this.currentTab = currentTab;
        this.description = `[ Summary ] [ Suggestions ] [ L-by-L ]`;
        this.tooltip = 'Click tabs to switch views';
        this.contextValue = 'tabHeader';
    }
}
class SeparatorItem extends vscode.TreeItem {
    constructor(label) {
        super(label);
        this.description = '─'.repeat(50);
    }
}
class FileItem extends vscode.TreeItem {
    constructor(filePath, analysis, currentTab) {
        super(path.basename(filePath));
        this.filePath = filePath;
        this.analysis = analysis;
        this.currentTab = currentTab;
        this.tooltip = filePath;
        this.description = analysis.summary;
        this.contextValue = 'file';
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
}
class SummaryItem extends vscode.TreeItem {
    constructor(summary) {
        super('🔹 Code Summary:');
        this.description = summary;
        this.tooltip = summary;
    }
}
class CategoryHeaderItem extends vscode.TreeItem {
    constructor(category) {
        super(`✅ ${category.charAt(0).toUpperCase() + category.slice(1)}:`);
        this.tooltip = `Suggestions for ${category}`;
    }
}
class SuggestionItem extends vscode.TreeItem {
    constructor(filePath, suggestion) {
        super(`- ${suggestion.text}`);
        this.filePath = filePath;
        this.suggestion = suggestion;
        this.tooltip = `Line ${suggestion.line}: ${suggestion.fixCode}`;
        this.description = `Line ${suggestion.line}`;
        this.command = {
            command: 'autofixer.applySuggestion',
            title: 'Apply Fix',
            arguments: [suggestion]
        };
    }
}
class LineItem extends vscode.TreeItem {
    constructor(filePath, line, suggestions) {
        super(`[${line}]`);
        this.filePath = filePath;
        this.line = line;
        this.suggestions = suggestions;
        this.description = suggestions.map(s => s.text).join(' | ');
        this.tooltip = suggestions.map(s => `${s.severity}: ${s.text}`).join('\n');
        this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map