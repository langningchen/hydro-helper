import fetch from '../fetch';
import settings from '../settings';
import webview from './webview';

export default class cWeb extends webview {
    constructor(tid: string, homework: boolean = false) {
        const type: string = homework ? 'homework' : 'contest';
        super({
            name: 'contest',
            data: { tid },
            url: `/${type}/${tid}`,
            title: `T${tid}`,
            fetchData: async ({ postMessage, parseMarkdown }) => {
                const awaitList = new Array<Promise<void>>();
                awaitList.push(new fetch({ path: `/d/${settings.domain}/${type}/${tid}` }).start().then(async (response) => {
                    if (response?.json !== undefined) {
                        const data = response.json;
                        data.tdoc.content = await parseMarkdown(data.tdoc.content);
                        const message = {
                            command: 'info',
                            data,
                        };
                        postMessage(message);
                    }
                }).catch((error) => {
                    throw error;
                }));
                awaitList.push(new fetch({ path: `/d/${settings.domain}/${type}/${tid}/scoreboard` }).start().then(async (response) => {
                    if (response?.json !== undefined) {
                        const message = {
                            command: 'scoreboard',
                            data: response.json,
                        };
                        postMessage(message);
                    }
                }).catch((error) => {
                    throw error;
                }));
                await Promise.all(awaitList);
            },
        });
    }
}
