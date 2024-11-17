import * as vscode from 'vscode';
import * as utils from './utils';
import fetch from './fetch';
import path from 'path';
import { io, outputChannel } from './io';
import settings from './settings';
import { WebSocket } from 'ws';
import auth from './auth';
import { parseFromString } from 'dom-parser';

export default class implements vscode.TreeDataProvider<Record> {
    private _onDidChangeTreeData: vscode.EventEmitter<Record | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Record | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;
    private records: Record[] = [];
    private pendingRecords: Record[] = [];

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshRTree', () => {
            outputChannel.trace('[rTree   ]', '"refreshRTree"');
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.rTreeNxt', () => {
            outputChannel.trace('[rTree   ]', '"rTreeNxt"');
            this.page++;
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.rTreePre', () => {
            outputChannel.trace('[rTree   ]', '"rTreePre"');
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });

        new Promise(async () => {
            const ws = new WebSocket(`wss://${settings.server}/record-conn?domainId=${settings.domain}`, {
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

    getTreeItem(element: Record): vscode.TreeItem {
        outputChannel.trace('[rTree   ]', '"getTreeItem"', arguments);
        return element;
    }

    async getChildren(): Promise<Record[]> {
        outputChannel.trace('[rTree   ]', '"getChildren"');
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
        try {
            const response = await new fetch({ path: `/d/${settings.domain}/record?page=${this.page}`, addCookie: true }).start();
            this.records = [];
            for (const rdoc of response.json.rdocs) {
                this.records.push(new Record(rdoc, response.json.pdict[rdoc.pid], response.json.udict[rdoc.uid]));
            }
            return this.records;
        } catch (e) {
            io.error((e as Error).message);
            return [];
        }
    }
}

export class Record extends vscode.TreeItem {
    constructor(rdoc: utils.RecordDoc, pdoc: utils.ProblemDoc | string, udoc: utils.UserDoc | string) {
        super(rdoc.score + ' ' + utils.statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.id = rdoc._id;
        this.contextValue = 'record';
        this.description = 'P' + rdoc.pid + ' ' + (typeof pdoc === 'string' ? pdoc : pdoc.title);
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[rdoc.status] + '.svg');
        const TooltipDoc = new vscode.MarkdownString();
        TooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[rdoc.status]}\n`);
        TooltipDoc.appendMarkdown(`- **User**: ${typeof udoc === 'string' ? udoc : udoc.uname}\n`);
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
