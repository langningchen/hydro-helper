import * as utils from './utils';
import { io, outputChannel } from './io';
import fetch from './fetch';
import settings from './settings';
import webview from './webview';
import { WebSocket } from 'ws';
import auth from './auth';

export default class rWeb extends webview {
    constructor(extensionPath: string, rid: string) {
        super({
            name: 'record',
            extensionPath,
            data: { rid },
            getTitle: () => `R${rid}`,
            fetchData: (postMessage, addTempFile, parseMarkdown, dispose) => {
                new Promise<string>(async (resolve) => {
                    const ws = new WebSocket(`ws${settings.safeProtocol ? "s" : ""}://${settings.server}/record-detail-conn?domainId=${settings.domain}&rid=${rid}`, {
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
                        postMessage({
                            command: 'record',
                            data: responseJSON,
                        });
                        if (utils.statusEnded[responseJSON.status]) {
                            ws.emit('close', 0, 'CYEZOI: Judged');
                        }
                    });

                    ws.on('error', (err) => {
                        io.error(err.toString());
                    });

                    ws.on('close', () => {
                        clearInterval(interval);
                        new fetch({ path: `/d/${settings.domain}/record/${rid}`, addCookie: true }).start().then(async (recordDetail) => {
                            if (recordDetail?.json !== undefined) {
                                postMessage({
                                    command: 'info',
                                    data: recordDetail.json
                                });
                                postMessage({
                                    command: 'record',
                                    data: recordDetail.json
                                });
                            }
                        }).catch(async (e: Error) => {
                            io.error(e.message);
                        });
                        resolve(rid);
                    });
                });
            },
        });
    }
}
