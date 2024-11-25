import * as utils from '../utils';
import { io } from '../io';
import fetch from '../fetch';
import settings from '../settings';
import webview from './webview';
import rdWs from '../websocket/rdWs';

export default class rWeb extends webview {
    constructor(extensionPath: string, rid: string) {
        super({
            name: 'record',
            extensionPath,
            data: { rid },
            getTitle: () => `R${rid}`,
            fetchData: ({ postMessage }) => {
                new rdWs(rid, (responseJSON) => {
                    postMessage({
                        command: 'record',
                        data: responseJSON,
                    });
                    if (utils.statusEnded[responseJSON.status]) {
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
                    }
                }).start();
            },
        });
    }
}
