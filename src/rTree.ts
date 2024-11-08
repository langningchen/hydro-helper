import * as vscode from 'vscode';
import * as utils from './utils';
import fetch from './fetch';
import path from 'path';
import { io, outputChannel } from './io';
import settings from './settings';

export default class implements vscode.TreeDataProvider<Record> {
    private _onDidChangeTreeData: vscode.EventEmitter<Record | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Record | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;

    constructor() {
        vscode.commands.registerCommand('cyezoi.refreshRTree', () => {
            outputChannel.trace('[rTree   ]', '"refreshRTree"');
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.rTreeNxt', () => {
            outputChannel.trace('[rTree   ]', '"rTreeNxt"');
            this.page++;
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand('cyezoi.rTreePre', () => {
            outputChannel.trace('[rTree   ]', '"rTreePre"');
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: Record): vscode.TreeItem {
        outputChannel.trace('[rTree   ]', '"getTreeItem"', arguments);
        return element;
    }

    async getChildren(): Promise<Record[]> {
        outputChannel.trace('[rTree   ]', '"getChildren"');
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
    constructor(rdoc: utils.RecordDoc, pdoc: utils.ProblemDoc, udoc: utils.UserDoc) {
        super(rdoc.score + ' ' + utils.statusName[rdoc.status], vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'record';
        this.description = 'P' + rdoc.pid + ' ' + pdoc.title;
        this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[rdoc.status] + '.svg');
        const TooltipDoc = new vscode.MarkdownString();
        TooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[rdoc.status]}\n`);
        TooltipDoc.appendMarkdown(`- **User**: ${udoc.uname}\n`);
        TooltipDoc.appendMarkdown(`- **Score**: ${rdoc.score}\n`);
        if (rdoc.time) { TooltipDoc.appendMarkdown(`- **Time**: ${utils.toTime(rdoc.time)}\n`); }
        if (rdoc.memory) { TooltipDoc.appendMarkdown(`- **Memory**: ${utils.toMemory(rdoc.memory)}\n`); }
        TooltipDoc.appendMarkdown(`- **Lang**: ${utils.languageDisplayName[rdoc.lang]}\n`);
        TooltipDoc.appendMarkdown(`- **Judge At**: ${utils.toRelativeTime(new Date(rdoc.judgeAt).getTime())}\n`);
        this.tooltip = TooltipDoc;
        this.command = {
            command: 'cyezoi.openT',
            title: 'Open Record',
            arguments: [rdoc._id],
        };
    }
}
