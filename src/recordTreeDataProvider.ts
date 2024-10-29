import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import path from 'path';
import { languageDisplayName, ProblemDoc, RecordDoc, statusIcon, statusName, UserDoc } from './static';
import { io } from './io';
import { cyezoiSettings } from './settings';

export class cyezoiRecordTreeDataProvider implements vscode.TreeDataProvider<Record> {
    private _onDidChangeTreeData: vscode.EventEmitter<Record | undefined>;
    readonly onDidChangeTreeData: vscode.Event<Record | undefined>;
    private page: number = 1;

    constructor(_onDidChangeTreeData: vscode.EventEmitter<Record | undefined>) {
        this._onDidChangeTreeData = _onDidChangeTreeData;
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        vscode.commands.registerCommand('cyezoi.refreshRecordTree', () => {
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.recordTreeNextPage', () => {
            this.page++;
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.recordTreePreviousPage', () => {
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Record): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<Record[]> {
        try {
            io.log('Fetching record list...');
            const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/record?page=${this.page}`, addCookie: true }).start();
            io.log('Record list fetched.');
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
        const tooltipDoc = new vscode.MarkdownString();
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', statusIcon[rdoc.status] + '.svg');
        tooltipDoc.appendMarkdown(`- **Status**: ${statusName[rdoc.status]}\n`);
        tooltipDoc.appendMarkdown(`- **User**: ${udoc.uname}\n`);
        tooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        tooltipDoc.appendMarkdown(`- **Time**: ${rdoc.time}ms\n`);
        tooltipDoc.appendMarkdown(`- **Memory**: ${rdoc.memory}KB\n`);
        tooltipDoc.appendMarkdown(`- **Lang**: ${languageDisplayName[rdoc.lang]}\n`);
        tooltipDoc.appendMarkdown(`- **Judge At**: ${rdoc.judgeAt}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openRecord',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
