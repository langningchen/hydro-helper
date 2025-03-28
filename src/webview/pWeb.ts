import fetch from '../fetch';
import settings from '../settings';
import webview from './webview';

export default class pWeb extends webview {
    constructor(pid: number, tid?: string) {
        super({
            name: 'problem',
            data: { pid, tid },
            url: `/p/${pid}` + (tid ? `?tid=${tid}` : ''),
            title: 'P' + pid + (tid ? ` - T${tid}` : ''),
            fetchData: async ({ postMessage, parseMarkdown }) => {
                const awaitList = new Array<Promise<void>>();
                awaitList.push(new fetch({ path: `/d/${settings.domain}/p/${pid}` + (tid ? `?tid=${tid}` : '') }).start().then(async (response) => {
                    if (response?.json !== undefined) {
                        let problemContent = response.json.pdoc.content;
                        try {
                            problemContent = JSON.parse(problemContent);
                            for (const [key, value] of Object.entries(problemContent)) {
                                problemContent[key] = await parseMarkdown(value as string, `/d/${settings.domain}/p/${pid}/file`, tid ? "?tid=" + tid : "");
                            }
                        } catch {
                            problemContent = await parseMarkdown(problemContent, `/d/${settings.domain}/p/${pid}/file`);
                        }
                        response.json.pdoc.content = problemContent;
                        const message = {
                            command: 'problem',
                            data: response.json,
                        };
                        postMessage(message);
                    }
                }).catch((error) => {
                    postMessage({ command: 'problem', error: (error as Error).message });
                }));

                if (!tid) {
                    awaitList.push(new fetch({ path: `/d/${settings.domain}/p/${pid}/solution`, addCookie: true }).start().then(async (response) => {
                        if (response?.json !== undefined) {
                            for (const solution of response.json.psdocs) {
                                solution.content = await parseMarkdown(solution.content as string, `/d/${settings.domain}/p/${pid}/file`);
                                for (const reply of solution.reply) {
                                    reply.content = await parseMarkdown(reply.content as string, `/d/${settings.domain}/p/${pid}/file`);
                                }
                            }
                            const message = {
                                command: 'solution',
                                data: response.json,
                            };
                            postMessage(message);
                        }
                    }).catch((error) => {
                        postMessage({ command: 'solution', error: (error as Error).message });
                    }));
                } else {
                    postMessage({ command: 'solution', data: null });
                }
                await Promise.all(awaitList);
            },
        });
    }
}
