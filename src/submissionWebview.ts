import path from 'path';
import * as vscode from 'vscode';
import { io } from './io';
import { cyezoiFetch } from './fetch';

interface TestCase {
    id: number;
    subtaskId: number;
    status: number;
    score: number;
    time: number;
    memory: number;
    message: string;
}
interface Subtask {
    type: string;
    score: number;
    status: number;
}
interface RecordDocument {
    _id: string;
    status: number;
    uid: number;
    code: string;
    lang: string;
    pid: number;
    domainId: string;
    score: number;
    time: number;
    memory: number;
    judgeTexts: string[];
    compilerTexts: string[];
    testCases: TestCase[];
    judger: number;
    judgeAt: string;
    rejudged: boolean;
    files: { [key: string]: string };
    subtasks: { [key: number]: Subtask };
}

export class submissionWebview {
    private static readonly viewType = 'submission';

    private _panel: vscode.WebviewPanel;
    private _extensionPath: string;

    constructor(rid: string, extensionPath: string) {
        this._panel = vscode.window.createWebviewPanel(
            submissionWebview.viewType,
            'CYEZOI - R' + rid,
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );
        this._extensionPath = extensionPath;

        this._panel.webview.html = this.getHtml();
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'openProblem':
                    vscode.commands.executeCommand('cyezoi.openProblem', message.problemId);
                    break;
            }
        });

        new cyezoiFetch({ path: '/d/problemset/record/' + rid, addCookie: true }).start().then(async (submissionDetail) => {
            if (submissionDetail?.json === undefined) {
                this._panel.webview.postMessage({ command: 'notFound', data: {} });
            } else {
                const record: RecordDocument = submissionDetail.json.rdoc;
                record.testCases.sort((a, b) => a.id - b.id);

                var subtasks: {
                    [key: number]: {
                        score: number,
                        status: number,
                        testCase: TestCase[],
                    },
                } = {};
                for (const [key, value] of Object.entries(record.subtasks)) {
                    subtasks[parseInt(key)] = {
                        score: value.score,
                        status: value.status,
                        testCase: [],
                    };
                }
                for (const testCase of record.testCases) {
                    if (subtasks[testCase.subtaskId] === undefined) {
                        subtasks[testCase.subtaskId] = {
                            score: 0,
                            status: 30,
                            testCase: [],
                        };
                    }
                    subtasks[testCase.subtaskId].testCase.push(testCase);
                }

                this._panel.webview.postMessage({
                    command: 'submission',
                    data: {
                        record,
                        subtasks,
                    }
                });
            }
        }).catch(async (e: Error) => {
            io.error(e.message);
        });
    }

    private getRealPath(relativePath: string[]): vscode.Uri {
        return this._panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionPath, ...relativePath)),
        );
    }

    private getHtml() {
        const staticFiles = [
            { 'path': ['res', 'libs', 'vscode-elements', 'bundled.js'], attributes: { 'type': 'module' } },
            { 'path': ['node_modules', '@vscode/codicons', 'dist', 'codicon.css'], attributes: { 'id': 'vscode-codicon-stylesheet' } },
            { 'path': ['res', 'libs', 'codemirror', 'codemirror.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'codemirror.min.css'] },
            { 'path': ['res', 'libs', 'codemirror', 'theme', 'material.min.css'] },
            { 'path': ['res', 'libs', 'codemirror', 'mode', 'clike', 'clike.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'fold', 'foldcode.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'fold', 'foldgutter.min.css'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'fold', 'foldgutter.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'fold', 'brace-fold.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'fold', 'comment-fold.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'fold', 'indent-fold.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'section', 'active-line.min.js'] },
            { 'path': ['res', 'libs', 'codemirror', 'addon', 'display', 'autorefresh.min.js'] },
            { 'path': ['res', 'html', 'submission.css'] },
            { 'path': ['res', 'html', 'submission.js'] },
        ];
        let submissionHtml = path.join(this._extensionPath, 'res', 'html', 'submission.html');
        let htmlContent = require('fs').readFileSync(submissionHtml, 'utf8');
        htmlContent = htmlContent.replace(/{{staticFiles}}/g, staticFiles.map(file => {
            let attributes = file.attributes === undefined ? '' : ' ' + Object.entries(file.attributes).map(([key, value]) => `${key}="${value}"`).join(' ');
            if (file.path[file.path.length - 1].endsWith('.css')) {
                return `<link rel="stylesheet" type="text/css" href="${this.getRealPath(file.path)}"${attributes}>`;
            }
            else if (file.path[file.path.length - 1].endsWith('.js')) {
                return `<script src="${this.getRealPath(file.path)}"${attributes}></script>`;
            }
            else {
                throw new Error('Unknown file type');
            }
        }).join('\n'));
        htmlContent = htmlContent.replace(/{{hydroIconsFile}}/g, this.getRealPath(['res', 'fonts', 'hydro-icons.woff2']));
        io.log(htmlContent);
        return htmlContent;
    }
}
