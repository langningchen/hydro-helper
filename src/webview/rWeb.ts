import * as utils from '../utils';
import fetch from '../fetch';
import settings from '../settings';
import webview from './webview';
import rdWs from '../websocket/rdWs';

export default class rWeb extends webview {
    constructor(rid: string) {
        super({
            name: 'record',
            data: { rid },
            url: `/record/${rid}`,
            title: `R${rid}`,
            fetchData: ({ postMessage }) => {
                new rdWs(rid, (responseJSON) => {
                    if (responseJSON.error) {
                        postMessage({
                            command: 'error',
                            data: responseJSON.error,
                        });
                        return;
                    }
                    postMessage({
                        command: 'record',
                        data: responseJSON,
                    });
                    if (utils.statusEnded[responseJSON.status]) {
                        new fetch({ path: `/d/${settings.domain}/record/${rid}` }).start().then(async (response) => {
                            if (response?.json !== undefined) {
                                postMessage({
                                    command: 'info',
                                    data: response.json
                                });
                                postMessage({
                                    command: 'record',
                                    data: response.json
                                });
                            }
                        });
                    }
                }).start();
            },
        });
    }
}
