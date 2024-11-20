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

    constructor(extensionPath: string, tid: string) {
        outputChannel.trace('[cWeb    ]', '"constructor"', arguments);
        outputChannel.info(`Open contest ${tid} webview`);
        this._panel = vscode.window.createWebviewPanel(
            'contest',
            'CYEZOI - T' + tid,
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
                case 'openP':
                    vscode.commands.executeCommand('cyezoi.openP', message.pid, tid);
                    break;
                case 'openT':
                    vscode.commands.executeCommand('cyezoi.openT', message.rid);
                    break;
                case 'refresh':
                    this.fetchData(tid);
                    break;
            }
        });
        this._panel.onDidDispose(this.cleanup);

        this.fetchData(tid);
    }

    private getRealPath = (relativePath: string[]): vscode.Uri => {
        return this._panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionPath, ...relativePath)),
        );
    };

    private getHtml = () => {
        const staticFiles = [
            { 'path': ['res', 'libs', 'vscode-elements', 'bundled.js'], attributes: { 'type': 'module' } },
            { 'path': ['res', 'libs', 'codicon', 'codicon.css'], attributes: { 'id': 'vscode-codicon-stylesheet' } },
            { 'path': ['res', 'libs', 'pdfjs', 'pdf.min.mjs'] },
            { 'path': ['res', 'html', 'static.js'] },
            { 'path': ['res', 'html', 'contest.js'] },
        ];
        let recordHtml = path.join(this._extensionPath, 'res', 'html', 'contest.html');
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

    private fetchData = async (tid: string) => {
        new fetch({
            path: `/d/${settings.domain}/contest/${tid}/scoreboard`
            , addCookie: true
        }).start().then(async (contestDetail) => {
            if (contestDetail?.json !== undefined) {
                const data = contestDetail.json;
                data.tdoc.content = await utils.parseMarkdown(this._extensionPath, this._panel.webview, data.tdoc.content);
                for (const [id, url] of Object.entries(data.tdoc.fetchData)) {
                    this._tempFiles.push(id);
                }
                const message = {
                    command: 'contest',
                    data,
                };
                this.tryPostMessage(message);
            }
        }).catch(async (e: Error) => {
            io.error(e.message);
        });
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
