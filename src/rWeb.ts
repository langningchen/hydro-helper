import { io } from './io';
import fetch from './fetch';
import settings from './settings';
import webview from './webview';

export default class rWeb extends webview {
    constructor(extensionPath: string, rid: string) {
        super({
            name: 'record',
            extensionPath,
            data: { rid },
            getTitle: () => `R${rid}`,
            fetchData: (postMessage, addTempFile, parseMarkdown, dispose) => {
                new fetch({ path: `/d/${settings.domain}/record/${rid}`, addCookie: true }).start().then(async (recordDetail) => {
                    if (recordDetail?.json !== undefined) {
                        postMessage({
                            command: 'record',
                            data: recordDetail.json
                        });
                    }
                }).catch(async (e: Error) => {
                    io.error(e.message);
                });
            },
        });
    }
}
