import * as vscode from 'vscode';
import * as utils from '../utils';
import fetch from '../fetch';
import path from 'path';
import { io } from '../io';
import settings from '../settings';
import { WebSocket } from 'ws';
import auth from '../auth';
import { parseFromString } from 'dom-parser';
import treeView from './treeView';

export default class extends treeView<Record> {
    private records: Record[] = [];
    private pendingRecords: Record[] = [];

    constructor() {
        super('record', async (page, setPageCount, element) => {
            setPageCount(1145141919810);
            if (this.pendingRecords.length) {
                while (this.pendingRecords.length) {
                    const pendingRecord = this.pendingRecords.shift()!;
                    var replace: boolean = false;
                    for (let i = 0; i < this.records.length; i++) {
                        if (this.records[i].id === pendingRecord.id) {
                            this.records[i] = pendingRecord;
                            replace = true;
                            break;
                        }
                    }
                    if (!replace) {
                        this.records.unshift(pendingRecord);
                    }
                }
                return this.records;
            }
            const response = await new fetch({ path: `/d/${settings.domain}/record?page=${page}`, addCookie: true }).start();
            this.records = [];
            for (const rdoc of response.json.rdocs) {
                this.records.push(new Record(rdoc, response.json.pdict[rdoc.pid], response.json.udict[rdoc.uid]));
            }
            return this.records;
        });

        new Promise(async () => {
            const ws = new WebSocket(`ws${settings.safeProtocol ? "s" : ""}://${settings.server}/record-conn?domainId=${settings.domain}`, {
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
                const dom = parseFromString(responseJSON.html);
                const tr = dom.getElementsByTagName('tr')[0];
                const rdoc: utils.RecordDoc = {
                    _id: tr.getAttribute('data-rid'),
                    status: utils.findIndex<number>(utils.statusName, tr.getElementsByClassName('record-status--text')[0].textContent.split('\n')[2].trim())!,
                    uid: parseInt(tr.getElementsByClassName('user-profile-name')[0].getAttribute('href').split('/').pop()!),
                    lang: utils.findIndex<string>(utils.languageDisplayName, tr.getElementsByClassName('col--lang')[0].textContent.trim())!,
                    pid: parseInt(tr.getElementsByClassName('col--problem')[0].textContent.split('\n')[1].trim()),
                    domainId: tr.getElementsByClassName('record-status--text')[0].getAttribute('href')!.split('/')[2],
                    score: parseInt(tr.getElementsByClassName('record-status--text')[0].getElementsByTagName('span')[0].textContent),
                    time: parseInt(tr.getElementsByClassName('col--time')[0].textContent.split('ms')[0]) || 0,
                    memory: parseFloat(tr.getElementsByClassName('col--memory')[0].textContent.split('MiB')[0]) * 1024 || 0,
                    judger: -1,
                    judgeAt: tr.getElementsByClassName('time')[0].textContent,
                    rejudged: false,
                    files: [],
                };
                const progress = tr.getElementsByClassName('col--status__progress')[0]?.getAttribute('style')?.split(':')[1].trim();
                const record = new Record(rdoc,
                    tr.getElementsByClassName('col--problem')[0].textContent.split('\n')[2].replaceAll('&nbsp;', '').trim() +
                    (progress ? ` (${progress})` : ''),
                    tr.getElementsByClassName('user-profile-name')[0].textContent.trim());
                this.pendingRecords.push(record);
                this._onDidChangeTreeData.fire(undefined);
            });

            ws.on('error', function error(err) {
                io.error(err.toString());
            });

            ws.on('close', (code, reason) => {
                clearInterval(interval);
            });
        });
    }
}

export class Record extends vscode.TreeItem {
    constructor(rdoc: utils.RecordDoc, pdoc: utils.ProblemDoc | string, udoc: utils.UserDoc | string) {
        if (typeof pdoc !== 'string') {
            pdoc = pdoc.title;
        }
        if (typeof udoc !== 'string') {
            udoc = udoc.uname;
        }

        super(rdoc.score + ' ' + utils.statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.id = rdoc._id;
        this.contextValue = 'record';
        if (rdoc.pid) {
            this.description = `P${rdoc.pid} ${pdoc}  ${udoc}`;
        }
        else {
            this.description = '*';
        }
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[rdoc.status] + '.svg');
        const TooltipDoc = new vscode.MarkdownString();
        TooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[rdoc.status]}\n`);
        TooltipDoc.appendMarkdown(`- **User**: ${udoc}\n`);
        TooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { TooltipDoc.appendMarkdown(`- **Time**: ${utils.toTime(rdoc.time)}\n`); }
        if (rdoc.memory) { TooltipDoc.appendMarkdown(`- **Memory**: ${utils.toMemory(rdoc.memory)}\n`); }
        TooltipDoc.appendMarkdown(`- **Lang**: ${utils.languageDisplayName[rdoc.lang]}\n`);
        TooltipDoc.appendMarkdown(`- **Judge At**: ${utils.toRelativeTime(new Date(rdoc.judgeAt).getTime())}\n`);
        this.tooltip = TooltipDoc;
        this.command = {
            command: 'cyezoi.openT',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
