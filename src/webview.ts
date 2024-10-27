import path from 'path';
import * as vscode from 'vscode';
import { io } from './io';

export interface StaticFile {
    path: string[];
    attributes?: { [key: string]: string };
}

export class cyezoiWebview {
    private static readonly viewType: string;

    private _panel: vscode.WebviewPanel;
    private _extensionPath: string;


    protected staticFiles = [];

    protected process(): void { }

    constructor(problemId: string, extensionPath: string) {
        this._panel = vscode.window.createWebviewPanel(
            cyezoiWebview.viewType,
            'CYEZOI - P' + problemId,
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );
        this._extensionPath = extensionPath;
        this._panel.webview.html = this.getHtml();

        this.process();
    }

    private getRealPath(relativePath: string[]): vscode.Uri {
        return this._panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionPath, ...relativePath)),
        );
    }

    private generateHtmlByStaticFiles(staticFiles: StaticFile[]): string {
        return staticFiles.map(file => {
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
        }).join('\n');
    }

    private getHtml() {
        let submissionHtml = path.join(this._extensionPath, 'res', 'html', 'problem.html');
        let htmlContent = require('fs').readFileSync(submissionHtml, 'utf8');
        htmlContent = htmlContent.replace(/{{staticFiles}}/g, this.generateHtmlByStaticFiles(this.staticFiles));
        htmlContent = htmlContent.replace(/{{hydroIconsFile}}/g, this.getRealPath(['res', 'fonts', 'hydro-icons.woff2']));
        return htmlContent;
    }
};
