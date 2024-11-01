import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import { statusName, ContestDoc, contestRuleName, ContestProblemDoc } from './static';
import { io, outputChannel } from './io';
import { cyezoiSettings } from './settings';

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

    async getChildren(element?: vscode.TreeItem): Promise<Contest[] | ContestProblem[]> {
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
            else {
                const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/contest/${element.id}/problems`, addCookie: true, }).start();
                const records: ContestProblem[] = [];
                for (const rdoc of Object.keys(response.json.pdict)) {
                    records.push(new ContestProblem(response.json.pdict[rdoc]));
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
    constructor(cdoc: ContestDoc) {
        super(cdoc.title, vscode.TreeItemCollapsibleState.Collapsed);
        this.id = cdoc._id;
        this.contextValue = 'contest';
        const tooltipDoc = new vscode.MarkdownString();
        tooltipDoc.appendMarkdown(`- **Rule**: ${contestRuleName[cdoc.rule]}\n`);
        tooltipDoc.appendMarkdown(`- **Attend**: ${cdoc.attend} people\n`);
        tooltipDoc.appendMarkdown(`- **Begin At**: ${cdoc.beginAt}\n`);
        tooltipDoc.appendMarkdown(`- **End At**: ${cdoc.endAt}\n`);
        tooltipDoc.appendMarkdown(`- **Rated**: ${cdoc.rated ? 'Yes' : 'No'}\n`);
        tooltipDoc.appendMarkdown(`- **Allow View Code**: ${cdoc.allowViewCode ? 'Yes' : 'No'}\n`);
        this.tooltip = tooltipDoc;
    }
}

export class ContestProblem extends vscode.TreeItem {
    constructor(pdoc: ContestProblemDoc) {
        super(pdoc.docId.toString(), vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'contestProblem';
        this.description = pdoc.title;
        this.command = {
            command: 'cyezoi.openProblem',
            title: 'Open Problem',
            arguments: [pdoc.docId],
        };
    }
}
