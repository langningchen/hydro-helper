import * as vscode from 'vscode';
import * as utils from './utils';
import fetch from './fetch';
import { io, outputChannel } from './io';
import settings from './settings';
import path from 'path';

export default class implements vscode.TreeDataProvider<Contest> {
    private _onDidChangeTreeData: vscode.EventEmitter<Contest | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Contest | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;
    private pageCounter: number = -1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshCTree', () => {
            outputChannel.trace('[cTree   ]', '"refreshCTree"');
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.cTreeNxt', () => {
            outputChannel.trace('[cTree   ]', '"cTreeNxt"');
            if (this.pageCounter === -1) { io.warn('Please expand the contest tree first.'); return; }
            if (this.page < this.pageCounter) { this.page++; }
            else { io.warn('You are already on the last page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.cTreePre', () => {
            outputChannel.trace('[cTree   ]', '"cTreePre"');
            if (this.pageCounter === -1) { io.warn('Please expand the contest tree first.'); return; }
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Contest): vscode.TreeItem {
        outputChannel.trace('[cTree   ]', '"getTreeItem"', arguments);
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<Contest[] | ContestProblem[] | ContestRecord[]> {
        outputChannel.trace('[cTree   ]', '"getChildren"', arguments);
        try {
            if (element === undefined) {
                const response = await new fetch({ path: `/d/${settings.domain}/contest?page=${this.page}`, addCookie: true }).start();
                this.pageCounter = response.json.tpcount;
                const contests: Contest[] = [];
                for (const tdoc of response.json.tdocs) {
                    contests.push(new Contest(tdoc, response.json.tsdict[tdoc._id]?.attend));
                }
                return contests;
            }
            else if (element.contextValue === 'contest') {
                const tid = (element as Contest).id!;
                const response = await new fetch({ path: `/d/${settings.domain}/contest/${tid}/problems`, addCookie: true, }).start();
                const records: ContestProblem[] = [];
                for (const rdoc of Object.keys(response.json.pdict)) {
                    records.push(new ContestProblem(tid, response.json.pdict[rdoc], response.json.psdict[rdoc]));
                }
                return records;
            } else {
                const [tid, pid] = (element as ContestProblem).id!.split('-');
                const response = await new fetch({ path: `/d/${settings.domain}/contest/${tid}/problems`, addCookie: true, }).start();
                const records: ContestRecord[] = [];
                for (const rdoc of Object.keys(response.json.rdocs)) {
                    if (response.json.rdocs[rdoc].pid === parseInt(pid)) {
                        records.push(new ContestRecord(response.json.rdocs[rdoc]));
                    }
                }
                return records;
            }
        } catch (e) {
            io.error((e as Error).message);
            return [];
        }
    }
}

export class Contest extends vscode.TreeItem {
    constructor(tdoc: utils.ContestDoc, attended: boolean) {
        super(tdoc.title, vscode.TreeItemCollapsibleState.Collapsed);
        this.id = tdoc._id;
        this.contextValue = 'contest';
        this.description = utils.toTime(new Date(tdoc.endAt).getTime() - new Date(tdoc.beginAt).getTime());
        const tooltipDoc = new vscode.MarkdownString();
        tooltipDoc.appendMarkdown(`- **Rule**: ${utils.contestRuleName[tdoc.rule]}\n`);
        tooltipDoc.appendMarkdown(`- **Attend**: ${tdoc.attend} people\n`);
        tooltipDoc.appendMarkdown(`- **Begin At**: ${utils.toRelativeTime(new Date(tdoc.beginAt).getTime())}\n`);
        tooltipDoc.appendMarkdown(`- **End At**: ${utils.toRelativeTime(new Date(tdoc.endAt).getTime())}\n`);
        tooltipDoc.appendMarkdown(`- **Rated**: ${tdoc.rated ? 'Yes' : 'No'}\n`);
        tooltipDoc.appendMarkdown(`- **Allow View Code**: ${tdoc.allowViewCode ? 'Yes' : 'No'}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openC',
            title: 'Open Contest',
            arguments: [tdoc._id],
        };
        if (attended) {
            this.command = {
                command: 'cyezoi.attendC',
                title: 'Attend Contest',
                arguments: [tdoc._id],
            };
        }
    }
}

export class ContestProblem extends vscode.TreeItem {
    constructor(tid: string, pdoc: utils.ContestProblemDoc, psdoc?: utils.ContestProblemStatusDoc) {
        super(pdoc.docId.toString(), (psdoc ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None));
        this.id = tid + '-' + pdoc.docId;
        this.contextValue = 'problem';
        this.description = pdoc.title;
        const tooltipDoc = new vscode.MarkdownString();
        if (psdoc) {
            this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[psdoc.status] + '.svg');
            tooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[psdoc.status]}\n`);
            tooltipDoc.appendMarkdown(`- **Score**: ${psdoc.score}\n`);
        }
        tooltipDoc.appendMarkdown(`- **Memory**: ${pdoc.config.memoryMin} ~ ${pdoc.config.memoryMax}\n`);
        tooltipDoc.appendMarkdown(`- **Time**: ${pdoc.config.timeMin} ~ ${pdoc.config.timeMax}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openP',
            title: 'Open Problem',
            arguments: [pdoc.docId, tid],
        };
    }
}

export class ContestRecord extends vscode.TreeItem {
    constructor(rdoc: utils.RecordDoc) {
        super(rdoc.score + ' ' + utils.statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'record';
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[rdoc.status] + '.svg');
        const tooltipDoc = new vscode.MarkdownString();
        tooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[rdoc.status]}\n`);
        tooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { tooltipDoc.appendMarkdown(`- **Time**: ${utils.toTime(rdoc.time)}\n`); }
        if (rdoc.memory) { tooltipDoc.appendMarkdown(`- **Memory**: ${utils.toMemory(rdoc.memory * 1024)}\n`); }
        tooltipDoc.appendMarkdown(`- **Lang**: ${rdoc.lang}\n`);
        tooltipDoc.appendMarkdown(`- **Judge At**: ${utils.toRelativeTime(new Date(rdoc.judgeAt).getTime())}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openT',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
