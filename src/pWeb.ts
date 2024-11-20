import * as vscode from 'vscode';
import * as utils from './utils';
import path from 'path';
import { io, outputChannel } from './io';
import fetch from './fetch';
import settings from './settings';

export default class {
    private _panel: vscode.WebviewPanel;
    private _extensionPath: string;
    private _tempFiles: string[] = [];

    constructor(extensionPath: string, pid: number, tid?: string) {
        outputChannel.trace('[pWeb    ]', '"constructor"', arguments);
        outputChannel.info(`Open problem ${pid} webview`);
        this._panel = vscode.window.createWebviewPanel(
            'problem',
            'CYEZOI - P' + pid + (tid !== undefined ? ` - T${tid}` : ''),
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );
        this._extensionPath = extensionPath;

        this._panel.webview.html = this.getHtml();
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'submitProblem':
                    vscode.commands.executeCommand('cyezoi.submitProblem', pid, tid);
                    break;
                case 'refresh':
                    this.fetchData(pid, tid);
                    break;
                case 'openInProblemSet':
                    vscode.commands.executeCommand('cyezoi.openP', pid);
            }
        });
        this._panel.onDidDispose(this.cleanup);

        this.fetchData(pid, tid);
    }

    private getRealPath = (relativePath: string[]): vscode.Uri => {
        return this._panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionPath, ...relativePath)),
        );
    };

    private getHtml = () => {
        const staticFiles = [
            { 'path': ['res', 'libs', 'MathJax-3.2.2', 'tex-mml-chtml.js'], attributes: { 'async': undefined, 'id': 'MathJax-script' } },
            { 'path': ['res', 'libs', 'vscode-elements', 'bundled.js'], attributes: { 'type': 'module' } },
            { 'path': ['res', 'libs', 'codicon', 'codicon.css'], attributes: { 'id': 'vscode-codicon-stylesheet' } },
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
            { 'path': ['res', 'libs', 'pdfjs', 'pdf_viewer.min.css'] },
            { 'path': ['res', 'libs', 'pdfjs', 'pdf.min.mjs'] },
            { 'path': ['res', 'html', 'static.js'] },
            { 'path': ['res', 'html', 'problem.css'] },
            { 'path': ['res', 'html', 'problem.js'] },
        ];
        let recordHtml = path.join(this._extensionPath, 'res', 'html', 'problem.html');
        let htmlContent = require('fs').readFileSync(recordHtml, 'utf8');
        htmlContent = htmlContent.replace(/{{staticFiles}}/g, staticFiles.map(file => {
            let attributes = '';
            if (file.attributes !== undefined) {
                attributes = ' ' + Object.entries(file.attributes).map(([key, value]) => {
                    if (value === undefined) {
                        return key;
                    }
                    return `${key}="${value}"`;
                }).join(' ');
            }
            if (file.path[file.path.length - 1].endsWith('.css')) {
                return `<link rel="stylesheet" type="text/css" href="${this.getRealPath(file.path)}"${attributes}>`;
            }
            else if (file.path[file.path.length - 1].endsWith('.js')) {
                return `<script src="${this.getRealPath(file.path)}"${attributes}></script>`;
            }
            else if (file.path[file.path.length - 1].endsWith('.mjs')) {
                return `<script type="module" src="${this.getRealPath(file.path)}"${attributes}></script>`;
            }
            else {
                throw new Error('Unknown file type');
            }
        }).join('\n'));
        htmlContent = htmlContent.replace(/{{hydroIconsFile}}/g, this.getRealPath(['res', 'fonts', 'hydro-icons.woff2']));
        return htmlContent;
    };

    private fetchData = (pid: number, tid?: string) => {
        new fetch({
            path: `/d/${settings.domain}/p/${pid}` + (tid !== undefined ? `?tid=${tid}` : '')
            , addCookie: true
        }).start().then(async (problemDetail) => {
            if (problemDetail?.json !== undefined) {
                const problemContent = JSON.parse(problemDetail.json.pdoc.content);
                const markdownContent: { [key: string]: { fetchData: { [key: string]: string }, content: string } } = {};
                for (const [key, value] of Object.entries(problemContent)) {
                    markdownContent[key] = await utils.parseMarkdown(this._extensionPath, this._panel.webview, value as string, `/d/${settings.domain}/p/${pid}/file`);
                    for (const [id, url] of Object.entries(markdownContent[key].fetchData)) {
                        this._tempFiles.push(id);
                    }
                }
                const message = {
                    command: 'problem',
                    data: {
                        problemId: pid,
                        isContest: tid !== undefined,
                        title: problemDetail.json.pdoc.title,
                        markdownContent,
                    },
                };
                this.tryPostMessage(message);
            }
        }).catch(async (e: Error) => {
            io.error(e.message);
        });

        if (tid === undefined) {
            new fetch({ path: `/d/${settings.domain}/p/${pid}/solution`, addCookie: true }).start().then(async (solutionDetail) => {
                if (solutionDetail?.json !== undefined) {
                    for (const solution of solutionDetail.json.psdocs) {
                        solution.content = await utils.parseMarkdown(this._extensionPath, this._panel.webview, solution.content as string, `/d/${settings.domain}/p/${pid}/file`);
                        for (const [id, url] of Object.entries(solution.content.fetchData)) {
                            this._tempFiles.push(id);
                        }
                        for (const reply of solution.reply) {
                            reply.content = await utils.parseMarkdown(this._extensionPath, this._panel.webview, reply.content as string, `/d/${settings.domain}/p/${pid}/file`);
                            for (const [id, url] of Object.entries(reply.content.fetchData)) {
                                this._tempFiles.push(id);
                            }
                        }
                    }
                    const message = {
                        command: 'solution',
                        data: solutionDetail.json,
                    };
                    this.tryPostMessage(message);
                }
            }).catch(async (e: Error) => {
                io.error(e.message);
            });
        }
    };

    private tryPostMessage = (message: any) => {
        try {
            this._panel.webview.postMessage(message);
        } catch (e) {
            this.cleanup();
        }
    };

    private cleanup = () => {
        for (const id of this._tempFiles) {
            const filePath = vscode.Uri.file(path.join(this._extensionPath, 'temp', id));
            vscode.workspace.fs.delete(filePath);
            outputChannel.info("Delete temp file", `"${filePath.toString()}"`);
        }
    };
}
