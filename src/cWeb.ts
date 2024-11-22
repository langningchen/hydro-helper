import { io } from './io';
import fetch from './fetch';
import settings from './settings';
import webview from './webview';

export default class cWeb extends webview {
    constructor(extensionPath: string, tid: string) {
        super({
            name: 'contest',
            extensionPath,
            data: { tid },
            getTitle: () => `T${tid}`,
            fetchData: (postMessage, addTempFile, parseMarkdown, dispose) => {
                new fetch({
                    path: `/d/${settings.domain}/contest/${tid}/scoreboard`
                    , addCookie: true
                }).start().then(async (contestDetail) => {
                    if (contestDetail?.json !== undefined) {
                        const data = contestDetail.json;
                        data.tdoc.content = await parseMarkdown(data.tdoc.content, extensionPath);
                        for (const [id, url] of Object.entries(data.tdoc.content.fetchData)) {
                            addTempFile(id);
                        }
                        const message = {
                            command: 'contest',
                            data,
                        };
                        postMessage(message);
                    }
                }).catch(async (e: Error) => {
                    io.error(e.message);
                });
            },
        });
    }
}
