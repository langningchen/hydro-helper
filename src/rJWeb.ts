import * as vscode from 'vscode';
import * as utils from './utils';
import path from 'path';
import { io, outputChannel } from './io';
import settings from './settings';
import { WebSocket } from 'ws';
import auth from './auth';

export default class {
    private _panel: vscode.WebviewPanel;
    private _extensionPath: string;

    constructor(extensionPath: string, rid: string) {
        outputChannel.trace('[rJWeb   ]', '"constructor"', arguments);
        outputChannel.info(`Open record ${rid} webview`);
        this._panel = vscode.window.createWebviewPanel(
            'record',
            'CYEZOI - R' + rid + ' - Judging',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );
        this._extensionPath = extensionPath;

        this._panel.webview.html = this.getHtml();

        this.fetchData(rid);
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
            { 'path': ['res', 'html', 'static.js'] },
            { 'path': ['res', 'html', 'recordJudging.css'] },
            { 'path': ['res', 'html', 'recordJudging.js'] },
        ];
        let recordHtml = path.join(this._extensionPath, 'res', 'html', 'recordJudging.html');
        let htmlContent = require('fs').readFileSync(recordHtml, 'utf8');
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
        return htmlContent;
    };

    private fetchData = async (rid: string) => {
        new Promise<string>(async (resolve) => {
            const ws = new WebSocket(`wss://${settings.server}/record-detail-conn?domainId=${settings.domain}&rid=${rid}`, {
                headers: {
                    'cookie': await auth.getCookiesValue(),
                },
            });

            var interval: NodeJS.Timeout;
            ws.on('open', function open() {
                interval = setInterval(() => {
                    ws.send('ping');
                }, 3e4);
            });

            ws.on('message', (data) => {
                const stringData = data.toString();
                if (stringData === 'ping') {
                    ws.send('pong');
                    return;
                }
                if (stringData === 'pong') {
                    return;
                }
                const responseJSON = JSON.parse(stringData);
                if (responseJSON.error === 'PermissionError' || responseJSON.error === 'PrivilegeError') {
                    ws.close();
                }
                outputChannel.info(stringData);
                this._panel.webview.postMessage(responseJSON);
                if (utils.statusEnded[responseJSON.status]) {
                    ws.emit('close', 0, 'CYEZOI: Judged');
                }
            });

            ws.on('error', function error(err) {
                io.error(err.toString());
            });

            ws.on('close', (code, reason) => {
                clearInterval(interval);
                this._panel.dispose();
                vscode.commands.executeCommand('cyezoi.openT', rid);
                resolve(rid);
            });
        });
    };
}
