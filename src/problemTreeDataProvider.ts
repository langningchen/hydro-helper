import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import path from 'path';
import { statusIcon, statusName, ProblemDoc, ProblemStatusDoc } from './static';
import { io } from './io';
import { cyezoiSettings } from './settings';

export class cyezoiProblemTreeDataProvider implements vscode.TreeDataProvider<Problem> {
    private _onDidChangeTreeData: vscode.EventEmitter<Problem | undefined>;
    readonly onDidChangeTreeData: vscode.Event<Problem | undefined>;
    private page: number = 1;
    private pageCounter: number = -1;

    constructor(_onDidChangeTreeData: vscode.EventEmitter<Problem | undefined>) {
        this._onDidChangeTreeData = _onDidChangeTreeData;
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        vscode.commands.registerCommand('cyezoi.refreshProblemTree', () => {
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.problemTreeNextPage', () => {
            if (this.pageCounter === -1) { io.warn('Please expand the problem tree first.'); return; }
            if (this.page < this.pageCounter) { this.page++; }
            else { io.warn('You are already on the last page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.problemTreePreviousPage', () => {
            if (this.pageCounter === -1) { io.warn('Please expand the problem tree first.'); return; }
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Problem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<Problem[]> {
        try {
            io.log('Fetching problem list...');
            const response = await new cyezoiFetch({ path: `/d/${cyezoiSettings.domain}/p?page=${this.page}`, addCookie: true }).start();
            io.log('Problem list fetched.');
            this.pageCounter = response.json.ppcount;
            const problems: Problem[] = [];
            for (const pdoc of response.json.pdocs) {
                problems.push(new Problem(pdoc, response.json.psdict[pdoc.docId]));
            }
            return problems;
        } catch (e) {
            io.error((e as Error).message);
            return [];
        }
    }
}

export class Problem extends vscode.TreeItem {
    constructor(pdoc: ProblemDoc, psdoc: ProblemStatusDoc) {
        super((pdoc.hidden ? '[HIDDEN] ' : '') + 'P' + pdoc.docId, vscode.TreeItemCollapsibleState.None);
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
