import { io } from '../io';
import fetch from '../fetch';
import settings from '../settings';
import webview from './webview';

export default class pWeb extends webview {
    constructor(pid: number, tid?: string) {
        super({
            name: 'problem',
            data: { pid, tid },
            getTitle: () => 'P' + pid + (tid !== undefined ? ` - T${tid}` : ''),
            fetchData: ({ postMessage, parseMarkdown }) => {
                new fetch({ path: `/d/${settings.domain}/p/${pid}` + (tid !== undefined ? `?tid=${tid}` : '') }).start().then(async (response) => {
                    if (response?.json !== undefined) {
                        var problemContent = response.json.pdoc.content;
                        try {
                            problemContent = JSON.parse(problemContent);
                            for (const [key, value] of Object.entries(problemContent)) {
                                problemContent[key] = await parseMarkdown(value as string, `/d/${settings.domain}/p/${pid}/file`);
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
                });

                if (tid === undefined) {
                    new fetch({ path: `/d/${settings.domain}/p/${pid}/solution`, addCookie: true }).start().then(async (response) => {
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
                    });
                } else {
                    postMessage({ command: 'solution', data: null });
                }
            },
        });
    }
}
