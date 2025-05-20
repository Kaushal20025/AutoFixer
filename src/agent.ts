import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AnalysisResult {
    summary: string;
    keyComponents: string[];
    dependencies: string[];
    architecture: string;
}

interface QuestionResponse {
    answer: string;
    confidence: number;
}

export class CodebaseAgent {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any;

    constructor() {
        const apiKey = vscode.workspace.getConfiguration('aiCodebaseBuddy').get<string>('geminiApiKey');
        if (!apiKey) {
            vscode.window.showErrorMessage('Please set your Gemini API key in settings');
            return;
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
} 