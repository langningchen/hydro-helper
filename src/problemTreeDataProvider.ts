import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import path from 'path';
import { statusIcon, statusName } from './static';
import { io } from './io';

export interface ProblemDoc {
    _id: string
    owner: number
    domainId: string
    docType: number
    docId: number
    title: string
    tag: string[]
    hidden: boolean
    nSubmit: number
    nAccept: number
    difficulty: number
    stats: {
        AC: number
        WA: number
        TLE: number
        MLE: number
        RE: number
        SE: number
        IGN: number
        CE: number
        s100: number
    }
}

export interface ProblemStatusDoc {
    _id: string
    docId: number
    docType: number
    domainId: string
    uid: number
    rid: string
    score: number
    status: number
    counter: number
}

export class cyezoiProblemTreeDataProvider implements vscode.TreeDataProvider<Problem> {
    private _onDidChangeTreeData: vscode.EventEmitter<Problem | undefined> = new vscode.EventEmitter<Problem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Problem | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;
    private pageCounter: number = 1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshProblemTree',
            (nextPage: boolean | undefined) => {
                if (nextPage === true) {
                    if (this.page < this.pageCounter) { this.page++; }
                    else { io.warn('You are already on the last page.'); }
                }
                else if (nextPage === false) {
                    if (this.page > 1) { this.page--; }
                    else { io.warn('You are already on the first page.'); }
                }
                return this._onDidChangeTreeData.fire(undefined);
            });
    }

    getTreeItem(element: Problem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: Problem): Promise<Problem[]> {
        if (!element) {
            try {
                io.log('Fetching problem list...');
                const response = await new cyezoiFetch({ path: `/d/problemset/p?page=${this.page}`, addCookie: true }).start();
                io.log('Problem list fetched.');
                this.pageCounter = response.json.ppcount;
                const problems: Problem[] = [];
                for (const pdoc of response.json.pdocs) {
                    problems.push(new Problem(pdoc, response.json.psdict[pdoc.docId]));
                }
                problems.push(new ProblemSwitchPage(false));
                problems.push(new ProblemSwitchPage(true));
                return problems;
            } catch (e) {
                io.error((e as Error).message);
                return [];
            }
        }
        return [];
    }
}

export class ProblemSwitchPage extends vscode.TreeItem {
    constructor(more: boolean = true) {
        super(more ? 'Next page' : 'Previous page', vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'problemSwitchPage';
        this.command = {
            command: 'cyezoi.refreshProblemTree',
            title: 'Load more problems',
            arguments: [more],
        };
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
