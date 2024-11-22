import * as vscode from 'vscode';
import * as utils from './utils';
import { io, outputChannel } from './io';
import settings from './settings';
import { WebSocket } from 'ws';
import auth from './auth';
import webview from './webview';

export default class rJWeb extends webview {
    constructor(extensionPath: string, rid: string) {
        super({
            name: 'recordJudging',
            extensionPath,
            data: { rid },
            getTitle: () => `R${rid} - Judging`,
            fetchData: (postMessage, addTempFile, parseMarkdown, dispose) => {
                new Promise<string>(async (resolve) => {
                    const ws = new WebSocket(`${settings.protocol === "https" ? "wss" : "ws"}://${settings.server}/record-detail-conn?domainId=${settings.domain}&rid=${rid}`, {
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
                        postMessage(responseJSON);
                        if (utils.statusEnded[responseJSON.status]) {
                            ws.emit('close', 0, 'CYEZOI: Judged');
                        }
                    });

                    ws.on('error', (err) => {
                        io.error(err.toString());
                    });

                    ws.on('close', () => {
                        clearInterval(interval);
                        dispose();
                        vscode.commands.executeCommand('cyezoi.openT', rid);
                        resolve(rid);
                    });
                });
            },
        });
    }
}
