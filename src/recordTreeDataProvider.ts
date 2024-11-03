import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import path from 'path';
import { languageDisplayName, ProblemDoc, RecordDoc, statusIcon, statusName, UserDoc } from './static';
import { io, outputChannel } from './io';
import { cyezoiSettings } from './settings';
import { toMemory, toRelativeTime, toTime } from './utils';

export class cyezoiRecordTreeDataProvider implements vscode.TreeDataProvider<Record> {
    private _onDidChangeTreeData: vscode.EventEmitter<Record | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Record | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshRecordTree', () => {
            outputChannel.trace('recordTreeDataProvider', 'refreshRecordTree');
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.recordTreeNextPage', () => {
            outputChannel.trace('recordTreeDataProvider', 'recordTreeNextPage');
            this.page++;
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.recordTreePreviousPage', () => {
            outputChannel.trace('recordTreeDataProvider', 'recordTreePreviousPage');
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Record): vscode.TreeItem {
        outputChannel.trace('recordTreeDataProvider', 'getTreeItem', arguments);
        return element;
    }

    async getChildren(): Promise<Record[]> {
        outputChannel.trace('recordTreeDataProvider', 'getChildren');
        try {
            const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/record?page=${this.page}`, addCookie: true }).start();
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
        const tooltipDoc = new vscode.MarkdownString();
        tooltipDoc.appendMarkdown(`- **Status**: ${statusName[rdoc.status]}\n`);
        tooltipDoc.appendMarkdown(`- **User**: ${udoc.uname}\n`);
        tooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { tooltipDoc.appendMarkdown(`- **Time**: ${toTime(rdoc.time)}\n`); }
        if (rdoc.memory) { tooltipDoc.appendMarkdown(`- **Memory**: ${toMemory(rdoc.memory)}\n`); }
        tooltipDoc.appendMarkdown(`- **Lang**: ${languageDisplayName[rdoc.lang]}\n`);
        tooltipDoc.appendMarkdown(`- **Judge At**: ${toRelativeTime(new Date(rdoc.judgeAt).getTime())}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openRecord',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
