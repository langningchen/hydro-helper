import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import { statusName, ContestDoc, contestRuleName, ContestProblemDoc, ContestProblemStatusDoc, statusIcon, RecordDoc } from './static';
import { io, outputChannel } from './io';
import { cyezoiSettings } from './settings';
import path from 'path';
import { toMemory, toRelativeTime, toTime } from './utils';

export class cyezoiContestTreeDataProvider implements vscode.TreeDataProvider<Contest> {
    private _onDidChangeTreeData: vscode.EventEmitter<Contest | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Contest | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;
    private pageCounter: number = -1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshContestTree', () => {
            outputChannel.trace('contestTreeDataProvider', 'refreshContestTree');
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.contestTreeNextPage', () => {
            outputChannel.trace('contestTreeDataProvider', 'contestTreeNextPage');
            if (this.pageCounter === -1) { io.warn('Please expand the contest tree first.'); return; }
            if (this.page < this.pageCounter) { this.page++; }
            else { io.warn('You are already on the last page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.contestTreePreviousPage', () => {
            outputChannel.trace('contestTreeDataProvider', 'contestTreePreviousPage');
            if (this.pageCounter === -1) { io.warn('Please expand the contest tree first.'); return; }
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Contest): vscode.TreeItem {
        outputChannel.trace('contestTreeDataProvider', 'getTreeItem', arguments);
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<Contest[] | ContestProblem[] | ContestRecord[]> {
        outputChannel.trace('contestTreeDataProvider', 'getChildren', arguments);
        try {
            if (element === undefined) {
                const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/contest?page=${this.page}`, addCookie: true }).start();
                this.pageCounter = response.json.tpcount;
                const contests: Contest[] = [];
                for (const pdoc of response.json.tdocs) {
                    contests.push(new Contest(pdoc));
                }
                return contests;
            }
            else if (element.contextValue === 'contest') {
                const tid = (element as Contest).id!;
                const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/contest/${tid}/problems`, addCookie: true, }).start();
                const records: ContestProblem[] = [];
                for (const rdoc of Object.keys(response.json.pdict)) {
                    records.push(new ContestProblem(tid, response.json.pdict[rdoc], response.json.psdict[rdoc]));
                }
                return records;
            } else {
                const [tid, pid] = (element as ContestProblem).id!.split('-');
                const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/contest/${tid}/problems`, addCookie: true, }).start();
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
    constructor(tdoc: ContestDoc) {
        super(tdoc.title, vscode.TreeItemCollapsibleState.Collapsed);
        this.id = tdoc._id;
        this.contextValue = 'contest';
        this.description = toTime(new Date(tdoc.endAt).getTime() - new Date(tdoc.beginAt).getTime());
        const tooltipDoc = new vscode.MarkdownString();
        tooltipDoc.appendMarkdown(`- **Rule**: ${contestRuleName[tdoc.rule]}\n`);
        tooltipDoc.appendMarkdown(`- **Attend**: ${tdoc.attend} people\n`);
        tooltipDoc.appendMarkdown(`- **Begin At**: ${toRelativeTime(new Date(tdoc.beginAt).getTime())}\n`);
        tooltipDoc.appendMarkdown(`- **End At**: ${toRelativeTime(new Date(tdoc.endAt).getTime())}\n`);
        tooltipDoc.appendMarkdown(`- **Rated**: ${tdoc.rated ? 'Yes' : 'No'}\n`);
        tooltipDoc.appendMarkdown(`- **Allow View Code**: ${tdoc.allowViewCode ? 'Yes' : 'No'}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openContest',
            title: 'Open Contest',
            arguments: [tdoc._id],
        };
    }
}

export class ContestProblem extends vscode.TreeItem {
    constructor(tid: string, pdoc: ContestProblemDoc, psdoc?: ContestProblemStatusDoc) {
        super(pdoc.docId.toString(), (psdoc ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None));
        this.id = tid + '-' + pdoc.docId;
        this.contextValue = 'problem';
        this.description = pdoc.title;
        const tooltipDoc = new vscode.MarkdownString();
        if (psdoc) {
            this.iconPath = path.join(__dirname, '..', 'res', 'icons', statusIcon[psdoc.status] + '.svg');
            tooltipDoc.appendMarkdown(`- **Status**: ${statusName[psdoc.status]}\n`);
            tooltipDoc.appendMarkdown(`- **Score**: ${psdoc.score}\n`);
        }
        tooltipDoc.appendMarkdown(`- **Memory**: ${pdoc.config.memoryMin} ~ ${pdoc.config.memoryMax}\n`);
        tooltipDoc.appendMarkdown(`- **Time**: ${pdoc.config.timeMin} ~ ${pdoc.config.timeMax}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openProblem',
            title: 'Open Problem',
            arguments: [pdoc.docId, tid],
        };
    }
}

export class ContestRecord extends vscode.TreeItem {
    constructor(rdoc: RecordDoc) {
        super(rdoc.score + ' ' + statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'record';
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', statusIcon[rdoc.status] + '.svg');
        const tooltipDoc = new vscode.MarkdownString();
        tooltipDoc.appendMarkdown(`- **Status**: ${statusName[rdoc.status]}\n`);
        tooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { tooltipDoc.appendMarkdown(`- **Time**: ${toTime(rdoc.time)}\n`); }
        if (rdoc.memory) { tooltipDoc.appendMarkdown(`- **Memory**: ${toMemory(rdoc.memory * 1024)}\n`); }
        tooltipDoc.appendMarkdown(`- **Lang**: ${rdoc.lang}\n`);
        tooltipDoc.appendMarkdown(`- **Judge At**: ${toRelativeTime(new Date(rdoc.judgeAt).getTime())}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openRecord',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
