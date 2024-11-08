import * as vscode from 'vscode';
import * as utils from './utils';
import fetch from './fetch';
import path from 'path';
import { io, outputChannel } from './io';
import settings from './settings';
import { Record } from './rTree';
import storage from './storage';

export default class implements vscode.TreeDataProvider<Problem> {
    private _onDidChangeTreeData: vscode.EventEmitter<Problem | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Problem | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;
    private pageCounter: number = -1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshPTree', () => {
            outputChannel.trace('[pTree   ]', '"refreshPTree"');
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.pTreeNxt', () => {
            outputChannel.trace('[pTree   ]', '"pTreeNxt"');
            if (this.pageCounter === -1) { io.warn('Please expand the problem tree first.'); return; }
            if (this.page < this.pageCounter) { this.page++; }
            else { io.warn('You are already on the last page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.pTreePre', () => {
            outputChannel.trace('[pTree   ]', '"pTreePre"');
            if (this.pageCounter === -1) { io.warn('Please expand the problem tree first.'); return; }
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Problem): vscode.TreeItem {
        outputChannel.trace('[pTree   ]', '"getTreeItem"', arguments);
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<Problem[] | ProblemRecord[]> {
        outputChannel.trace('[pTree   ]', '"getChildren"', arguments);
        try {
            if (element === undefined) {
                const response = await new fetch({ path: `/d/${settings.domain}/p?page=${this.page}`, addCookie: true }).start();
                this.pageCounter = response.json.ppcount;
                const problems: Problem[] = [];
                for (const pdoc of response.json.pdocs) {
                    problems.push(new Problem(pdoc, response.json.psdict[pdoc.docId]));
                }
                return problems;
            }
            else {
                const response = await new fetch({ path: `/d/${settings.domain}/record?uidOrName=${await storage.username}&pid=${(element.label as string).substring(1)}`, addCookie: true, }).start();
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
    constructor(pdoc: utils.ProblemDoc, psdoc: utils.ProblemStatusDoc) {
        super('P' + pdoc.docId, (psdoc ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None));
        this.contextValue = 'problem';
        this.description = pdoc.title;
        const tooltipDoc = new vscode.MarkdownString();
        if (pdoc.tag.length > 0) {
            tooltipDoc.appendMarkdown(`- **Tags**: ${pdoc.tag.join(', ')}\n`);
        }
        if (psdoc) {
            this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[psdoc.status] + '.svg');
            tooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[psdoc.status]}\n`);
            tooltipDoc.appendMarkdown(`- **Score**: ${psdoc.score}\n`);
        }
        tooltipDoc.appendMarkdown(`- **Difficulty**: ${pdoc.difficulty}\n`);
        tooltipDoc.appendMarkdown(`- **AC / Tried**: ${pdoc.nAccept}/${pdoc.stats.AC}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openP',
            title: 'Open Problem',
            arguments: [pdoc.docId],
        };
    }
}

export class ProblemRecord extends vscode.TreeItem {
    constructor(rdoc: utils.RecordDoc) {
        super(rdoc.score + ' ' + utils.statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'record';
        const tooltipDoc = new vscode.MarkdownString();
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[rdoc.status] + '.svg');
        tooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[rdoc.status]}\n`);
        tooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { tooltipDoc.appendMarkdown(`- **Time**: ${utils.toTime(rdoc.time)}\n`); }
        if (rdoc.memory) { tooltipDoc.appendMarkdown(`- **Memory**: ${utils.toMemory(rdoc.memory * 1024)}\n`); }
        tooltipDoc.appendMarkdown(`- **Lang**: ${utils.languageDisplayName[rdoc.lang]}\n`);
        tooltipDoc.appendMarkdown(`- **Judge At**: ${utils.toRelativeTime(new Date(rdoc.judgeAt).getTime())}\n`);
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openT',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
