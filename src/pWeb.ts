import { io } from './io';
import fetch from './fetch';
import settings from './settings';
import webview from './webview';

export default class pWeb extends webview {
    constructor(extensionPath: string, pid: number, tid?: string) {
        super({
            name: 'problem',
            extensionPath,
            data: { pid, tid },
            getTitle: () => 'P' + pid + (tid !== undefined ? ` - T${tid}` : ''),
            fetchData: (postMessage, addTempFile, parseMarkdown) => {
                new fetch({
                    path: `/d/${settings.domain}/p/${pid}` + (tid !== undefined ? `?tid=${tid}` : '')
                    , addCookie: true
                }).start().then(async (problemDetail) => {
                    if (problemDetail?.json !== undefined) {
                        const problemContent = JSON.parse(problemDetail.json.pdoc.content);
                        const markdownContent: { [key: string]: { fetchData: { [key: string]: string }, content: string } } = {};
                        for (const [key, value] of Object.entries(problemContent)) {
                            markdownContent[key] = await parseMarkdown(value as string, `/d/${settings.domain}/p/${pid}/file`);
                            for (const [id, url] of Object.entries(markdownContent[key].fetchData)) {
                                addTempFile(id);
                            }
                        }
                        const message = {
                            command: 'problem',
                            data: {
                                pid,
                                tid,
                                title: problemDetail.json.pdoc.title,
                                markdownContent,
                            },
                        };
                        postMessage(message);
                    }
                }).catch(async (e: Error) => {
                    io.error(e.message);
                });

                if (tid === undefined) {
                    new fetch({ path: `/d/${settings.domain}/p/${pid}/solution`, addCookie: true }).start().then(async (solutionDetail) => {
                        if (solutionDetail?.json !== undefined) {
                            for (const solution of solutionDetail.json.psdocs) {
                                solution.content = await parseMarkdown(solution.content as string, `/d/${settings.domain}/p/${pid}/file`);
                                for (const [id, url] of Object.entries(solution.content.fetchData)) {
                                    addTempFile(id);
                                }
                                for (const reply of solution.reply) {
                                    reply.content = await parseMarkdown(reply.content as string, `/d/${settings.domain}/p/${pid}/file`);
                                    for (const [id, url] of Object.entries(reply.content.fetchData)) {
                                        addTempFile(id);
                                    }
                                }
                            }
                            const message = {
                                command: 'solution',
                                data: solutionDetail.json,
                            };
                            postMessage(message);
                        }
                    }).catch(async (e: Error) => {
                        io.error(e.message);
                    });
                }
            },
        });
    }
}
