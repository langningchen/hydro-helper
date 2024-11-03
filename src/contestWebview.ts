import path from 'path';
import * as vscode from 'vscode';
import { io, outputChannel } from './io';
import fetch from './fetch';
import settings from './settings';
import { marked } from 'marked';

export default class {
    private _panel: vscode.WebviewPanel;
    private _extensionPath: string;

    constructor(extensionPath: string, tid: string) {
        outputChannel.trace('[contestWebview]', '"constructor"', arguments);
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
                case 'openProblem':
                    vscode.commands.executeCommand('cyezoi.openProblem', message.pid, tid);
                    break;
                case 'openRecord':
                    vscode.commands.executeCommand('cyezoi.openRecord', message.rid);
                    break;
            }
        });

        new fetch({
            path: `/d/${settings.domain}/contest/${tid}/scoreboard`
            , addCookie: true
        }).start().then(async (contestDetail) => {
            if (contestDetail?.json !== undefined) {
                const data = contestDetail.json;
                data.tdoc.content = await marked(data.tdoc.content);
                const message = {
                    command: 'contest',
                    data,
                };
                this._panel.webview.postMessage(message);
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
            { 'path': ['res', 'libs', 'codicon', 'codicon.css'], attributes: { 'id': 'vscode-codicon-stylesheet' } },
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
            else {
                throw new Error('Unknown file type');
            }
        }).join('\n'));
        htmlContent = htmlContent.replace(/{{hydroIconsFile}}/g, this.getRealPath(['res', 'fonts', 'hydro-icons.woff2']));
        return htmlContent;
    }
}
