import * as vscode from 'vscode';
import * as path from 'path';
import { marked } from 'marked';
import { outputChannel } from '../io';
import auth from '../auth';
import settings from '../settings';
import storage from '../storage';
import { readFileSync } from 'fs';

interface fetchDataParams {
    postMessage: (message) => void
    parseMarkdown: (markdown: string, prefix?: string, suffix?: string) => Promise<{ fetchData: { [key: string]: string }, content: string }>
    dispose: () => void
};

export interface WebviewData {
    name: string;
    data: { [key: string]: string | number };
    url: string;
    title: string;
    fetchData: (params: fetchDataParams) => Promise<void>;
}

interface WebviewMessage {
    command: string;
    error?: string;
    data: string[];
}

const openedWebviews: Map<string, vscode.WebviewPanel> = new Map();

export default class webview {
    private panel: vscode.WebviewPanel | undefined;
    private tempFiles: string[] = [];
    private webviewData: WebviewData;
    private shortName: string;
    private disposed: boolean = false;
    public dispose: Promise<void>;
    private fireDispose: () => void = () => { };

    constructor(data: WebviewData) {
        this.webviewData = data;
        this.shortName = this.webviewData.name.charAt(0) + "Web";
        this.dispose = new Promise<void>((resolve) => {
            this.fireDispose = resolve;
        });

        if (openedWebviews.has(this.webviewData.title)) {
            openedWebviews.get(this.webviewData.title)!.reveal();
            return;
        }

        outputChannel.trace(`[${this.shortName}    ]`, '"constructor"', data);
        outputChannel.info(`Open webview`, `"${this.webviewData.title}"`);
        this.panel = vscode.window.createWebviewPanel(
            this.webviewData.name,
            `Hydro - ${this.webviewData.title}`,
            settings.webviewColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );
        openedWebviews.set(this.webviewData.title, this.panel);

        this.getHTML();
        this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
            if (message.command === 'refresh') {
                this.fetchData();
            } else if (message.command === 'dispose') {
                this.panel!.dispose();
            } else if (message.command === 'openInBrowser') {
                vscode.env.openExternal(vscode.Uri.parse(`http${settings.safeProtocol ? "s" : ""}://${settings.server}/d/${settings.domain}${data.url}`));
            } else {
                vscode.commands.executeCommand(`hydro-helper.${message.command}`, ...message.data);
            }
        });
        this.panel.onDidDispose(this.cleanup);

        try {
            this.fetchData();
        } catch (e) {
            outputChannel.error('Error fetching data:', (e as Error).message);
            this.cleanup();
        }

    }

    private getRealPath = async (relativePath: string[]): Promise<vscode.Uri> => {
        return this.panel!.webview.asWebviewUri(
            vscode.Uri.file(path.join((await storage.extensionPath)!, ...relativePath)),
        );
    };

    private getHTML = async (): Promise<void> => {
        outputChannel.trace(`[${this.shortName}    ]`, '"getHTML"');
        let htmlContent = readFileSync(path.join((await storage.extensionPath)!, 'res', 'html', 'base.html'), 'utf8');
        htmlContent = htmlContent.replace("{{hydroIcons}}", (await this.getRealPath(['res', 'fonts', 'hydro-icons.woff2'])).toString());
        htmlContent = htmlContent.replace("{{vscodeElements}}", (await this.getRealPath(['res', 'libs', 'vscode-elements', 'bundled.js'])).toString());
        htmlContent = htmlContent.replace("{{codicon}}", (await this.getRealPath(['res', 'libs', 'codicon', 'codicon.css'])).toString());
        htmlContent = htmlContent.replace("{{static}}", (await this.getRealPath(['res', 'html', 'static.js'])).toString());
        htmlContent = htmlContent.replace("{{dynamic}}", (await this.getRealPath(['res', 'html', `${this.webviewData.name}.js`])).toString());
        this.panel!.webview.html = htmlContent;
    };

    private fetchData = () => {
        outputChannel.trace(`[${this.shortName}    ]`, '"fetchData"');
        const safePostMessage = (message) => {
            if (!this.disposed) {
                this.panel!.webview.postMessage(message);
            }
        };
        this.webviewData.fetchData({
            postMessage: safePostMessage,
            parseMarkdown: async (markdown, prefix?, suffix?) => {
                const fetchData: { [key: string]: string } = {};
                const parsedMarkdown = markdown.replace(/@\[(video|pdf)\]\((.+?)\)/g, (_match, type, url) => {
                    if (url.startsWith('file://')) {
                        url = prefix + '/' + url.substring(7);
                    }
                    url = url.split('?')[0];
                    url += suffix ?? "";
                    if (type === 'video') {
                        return `<vscode-button onclick="vscode.postMessage({command:'downloadFile',data:['${url}','Video.mp4']})">Download Video</vscode-button>`;
                    }
                    const id = Math.random().toString(36).slice(2);
                    fetchData[id] = url;
                    if (type === 'pdf') {
                        return `<vscode-button onclick="vscode.postMessage({command:'downloadFile',data:['${url}','PDF.pdf']})">Download PDF</vscode-button><div data-src="{{${id}}}" class="pdf"></div>`;
                    }
                    return '<a href="' + id + '">' + url + '</a>';
                });
                for (const [key, value] of Object.entries(fetchData)) {
                    const responseData = await fetch(`http${settings.safeProtocol ? "s" : ""}://${settings.server}${value}`, {
                        headers: {
                            'cookie': await auth.getCookiesValue(),
                        },
                        redirect: 'follow',
                    });
                    const filePath = vscode.Uri.file(`${(await storage.extensionPath)!}/temp/${key}`);
                    await vscode.workspace.fs.writeFile(filePath, new Uint8Array(await responseData.arrayBuffer()));
                    const webviewUri = this.panel!.webview.asWebviewUri(filePath);
                    outputChannel.info('Saved', `"http${settings.safeProtocol ? "s" : ""}://${settings.server}${value}"`, 'to file', `"${filePath.toString()}"`, 'url', `"${webviewUri.toString()}"`);
                    fetchData[key] = webviewUri.toString();
                    this.tempFiles.push(key);
                }
                return {
                    fetchData,
                    content: await marked(parsedMarkdown),
                    rawContent: markdown,
                };
            },
            dispose: () => {
                this.panel!.dispose();
            }
        }).catch((e) => {
            safePostMessage({ command: 'error', data: (e as Error).message });
        });
    };

    private cleanup = async () => {
        this.disposed = true;
        outputChannel.trace(`[${this.shortName}    ]`, '"cleanup"');
        for (const id of this.tempFiles) {
            const filePath = vscode.Uri.file(path.join((await storage.extensionPath)!, 'temp', id));
            await vscode.workspace.fs.delete(filePath);
            outputChannel.info("Delete temp file", `"${filePath.toString()}"`);
        }
        openedWebviews.delete(this.webviewData.title);
        this.fireDispose();
    };
}
