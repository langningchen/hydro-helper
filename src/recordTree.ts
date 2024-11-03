import * as vscode from 'vscode';
import fetch from './fetch';
import path from 'path';
import { languageDisplayName, ProblemDoc, RecordDoc, statusIcon, statusName, UserDoc } from './static';
import { io, outputChannel } from './io';
import settings from './settings';
import { toMemory, toRelativeTime, toTime } from './utils';

export default class implements vscode.TreeDataProvider<Record> {
    private _onDidChangeTreeData: vscode.EventEmitter<Record | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Record | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshRecordTree', () => {
            outputChannel.trace('[recordTree]', '"refreshRecordTree"');
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.recordTreeNextPage', () => {
            outputChannel.trace('[recordTree]', '"recordTreeNextPage"');
            this.page++;
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.recordTreePreviousPage', () => {
            outputChannel.trace('[recordTree]', '"recordTreePreviousPage"');
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Record): vscode.TreeItem {
        outputChannel.trace('[recordTree]', '"getTreeItem"', arguments);
        return element;
    }

    async getChildren(): Promise<Record[]> {
        outputChannel.trace('[recordTree]', '"getChildren"');
        try {
            const response = await new fetch({ path: `/d/${settings.domain}/record?page=${this.page}`, addCookie: true }).start();
            const problems: Record[] = [];
            for (const rdoc of response.json.rdocs) {
                problems.push(new Record(rdoc, response.json.pdict[rdoc.pid], response.json.udict[rdoc.uid]));
            }
            return problems;
        } catch (e) {
            io.error((e as Error).message);
            return [];
        }
    }
}

export class Record extends vscode.TreeItem {
    constructor(rdoc: RecordDoc, pdoc: ProblemDoc, udoc: UserDoc) {
        super(rdoc.score + ' ' + statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'record';
        this.description = 'P' + rdoc.pid + ' ' + pdoc.title;
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', statusIcon[rdoc.status] + '.svg');
        const TooltipDoc = new vscode.MarkdownString();
        TooltipDoc.appendMarkdown(`- **Status**: ${statusName[rdoc.status]}\n`);
        TooltipDoc.appendMarkdown(`- **User**: ${udoc.uname}\n`);
        TooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { TooltipDoc.appendMarkdown(`- **Time**: ${toTime(rdoc.time)}\n`); }
        if (rdoc.memory) { TooltipDoc.appendMarkdown(`- **Memory**: ${toMemory(rdoc.memory)}\n`); }
        TooltipDoc.appendMarkdown(`- **Lang**: ${languageDisplayName[rdoc.lang]}\n`);
        TooltipDoc.appendMarkdown(`- **Judge At**: ${toRelativeTime(new Date(rdoc.judgeAt).getTime())}\n`);
        this.tooltip = TooltipDoc;
        this.command = {
            command: 'cyezoi.openRecord',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
