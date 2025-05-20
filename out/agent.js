"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodebaseAgent = void 0;
const vscode = require("vscode");
const generative_ai_1 = require("@google/generative-ai");
class CodebaseAgent {
    constructor() {
        this.genAI = null;
        const apiKey = vscode.workspace.getConfiguration('aiCodebaseBuddy').get('geminiApiKey');
        if (!apiKey) {
            vscode.window.showErrorMessage('Please set your Gemini API key in settings');
            return;
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
}
exports.CodebaseAgent = CodebaseAgent;
//# sourceMappingURL=agent.js.map