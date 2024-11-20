import * as vscode from 'vscode';
import path from 'path';
import { io, outputChannel } from './io';
import fetch from './fetch';
import settings from './settings';

export default class {
    private _panel: vscode.WebviewPanel;
    private _extensionPath: string;

    constructor(extensionPath: string, rid: string) {
        outputChannel.trace('[rWeb    ]', '"constructor"', arguments);
        outputChannel.info(`Open record ${rid} webview`);
        this._panel = vscode.window.createWebviewPanel(
            'record',
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
                case 'openP':
                    vscode.commands.executeCommand('cyezoi.openP', message.problemId, message.contestId);
                    break;
                case 'refresh':
                    this.fetchData(rid);
                    break;
            }
        });

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
            { 'path': ['res', 'html', 'record.css'] },
            { 'path': ['res', 'html', 'record.js'] },
        ];
        let recordHtml = path.join(this._extensionPath, 'res', 'html', 'record.html');
        let htmlContent = require('fs').readFileSync(recordHtml, 'utf8');
        htmlContent = htmlContent.replace(/{{staticFiles}}/g, staticFiles.map(file => {
            let attributes = file.attributes === undefined ? '' : ' ' + Object.entries(file.attributes).map(([key, value]) => `${key}="${value}"`).join(' ');
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

    private fetchData = async (rid: string) => {
        new fetch({ path: `/d/${settings.domain}/record/${rid}`, addCookie: true }).start().then(async (recordDetail) => {
            if (recordDetail?.json !== undefined) {
                this._panel.webview.postMessage({
                    command: 'record',
                    data: recordDetail.json
                });
            }
        }).catch(async (e: Error) => {
            io.error(e.message);
        });
    };
}
