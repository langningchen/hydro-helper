import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import path from 'path';
import { statusIcon, statusName, ProblemDoc, ProblemStatusDoc, RecordDoc, languageDisplayName } from './static';
import { io } from './io';
import { cyezoiSettings } from './settings';
import { Record } from './recordTreeDataProvider';
import { cyezoiStorage } from './storage';

export class cyezoiProblemTreeDataProvider implements vscode.TreeDataProvider<Problem> {
    private _onDidChangeTreeData: vscode.EventEmitter<Problem | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Problem | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;
    private pageCounter: number = -1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshProblemTree', () => {
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.problemTreeNextPage', () => {
            if (this.pageCounter === -1) { io.warn(vscode.l10n.t('expandProblemTreeFirst')); return; }
            if (this.page < this.pageCounter) { this.page++; }
            else { io.warn(vscode.l10n.t('alreadyLastPage')); }
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.problemTreePreviousPage', () => {
            if (this.pageCounter === -1) { io.warn(vscode.l10n.t('expandProblemTreeFirst')); return; }
            if (this.page > 1) { this.page--; }
            else { io.warn(vscode.l10n.t('alreadyFirstPage')); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Problem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<Problem[] | ProblemRecord[]> {
        try {
            if (element === undefined) {
                io.log('Fetching problem list...');
                const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/p?page=${this.page}`, addCookie: true }).start();
                io.log('Problem list fetched.');
                this.pageCounter = response.json.ppcount;
                const problems: Problem[] = [];
                for (const pdoc of response.json.pdocs) {
                    problems.push(new Problem(pdoc, response.json.psdict[pdoc.docId]));
                }
                return problems;
            }
            else {
                io.log('Fetching record list...');
                const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/record?uidOrName=${await cyezoiStorage.username}&pid=${(element.label as string).substring(1)}`, addCookie: true, }).start();
                io.log(JSON.stringify(response));
                io.log('Record list fetched.');
                const records: Record[] = [];
                for (const rdoc of response.json.rdocs) {
                    records.push(new ProblemRecord(rdoc));
                }
                return records;
            }
        } catch (e) {
            io.error((e as Error).message);
            return [];
        }
    }
}

export class Problem extends vscode.TreeItem {
    constructor(pdoc: ProblemDoc, psdoc: ProblemStatusDoc) {
        super('P' + pdoc.docId, (psdoc ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None));
        this.contextValue = 'problem';
        this.description = pdoc.title;
        const tooltipDoc = new vscode.MarkdownString();
        if (pdoc.tag.length > 0) {
            tooltipDoc.appendMarkdown(`- **Tags**: ${pdoc.tag.join(', ')}\n`);
        }
        if (psdoc) {
            this.iconPath = path.join(__dirname, '..', 'res', 'icons', statusIcon[psdoc.status] + '.svg');
            tooltipDoc.appendMarkdown(`- **Status**: ${statusName[psdoc.status]}\n`);
            tooltipDoc.appendMarkdown(`- **Score**: ${psdoc.score}\n`);
        }
        tooltipDoc.appendMarkdown(`- **Difficulty**: ${pdoc.difficulty}\n`);
        tooltipDoc.appendMarkdown(`- **AC / Tried**: ${pdoc.nAccept}/${pdoc.stats.AC}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openProblem',
            title: 'Open Problem',
            arguments: [pdoc.docId],
        };
    }
}

export class ProblemRecord extends vscode.TreeItem {
    constructor(rdoc: RecordDoc) {
        super(rdoc.score + ' ' + statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'record';
        const tooltipDoc = new vscode.MarkdownString();
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', statusIcon[rdoc.status] + '.svg');
        tooltipDoc.appendMarkdown(`- **Status**: ${statusName[rdoc.status]}\n`);
        tooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { tooltipDoc.appendMarkdown(`- **Time**: ${rdoc.time}ms\n`); }
        if (rdoc.memory) { tooltipDoc.appendMarkdown(`- **Memory**: ${rdoc.memory}KB\n`); }
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
