import * as vscode from 'vscode';
import * as utils from '../utils';
import fetch from '../fetch';
import path from 'path';
import settings from '../settings';
import { Record } from './rTree';
import storage from '../storage';
import treeView from './treeView';

export default class extends treeView<Problem | ProblemRecord> {
    constructor() {
        super('problem', async ({ page, setPageCounter, element }) => {
            if (element === undefined) {
                const response = await new fetch({ path: `/d/${settings.domain}/p?page=${page}` }).start();
                setPageCounter(response.json.ppcount);
                const problems: Problem[] = [];
                for (const pdoc of response.json.pdocs) {
                    problems.push(new Problem(pdoc, response.json.psdict[pdoc.docId]));
                }
                return problems;
            }
            else {
                const response = await new fetch({ path: `/d/${settings.domain}/record?uidOrName=${await storage.username}&pid=${(element.label as string).substring(1)}` }).start();
                const records: Record[] = [];
                for (const rdoc of response.json.rdocs) {
                    records.push(new ProblemRecord(rdoc));
                }
                return records;
            }
        });
    }
}

export class Problem extends vscode.TreeItem {
    constructor(pdoc: utils.ProblemDoc, psdoc: utils.ProblemStatusDoc, tid?: string) {
        super('P' + pdoc.docId, (psdoc && psdoc.status ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None));
        this.id = (tid ? tid + '-' : '') + pdoc.docId;
        this.contextValue = 'problem';
        this.description = pdoc.title;
        const tooltipDoc = new vscode.MarkdownString();
        if (pdoc.tag && pdoc.tag.length > 0) { tooltipDoc.appendMarkdown(`- **Tags**: ${pdoc.tag.join(', ')}\n`); }
        if (psdoc && psdoc.score) {
            tooltipDoc.appendMarkdown(`- **Score**: ${psdoc.score}\n`);
            this.description += '  ' + psdoc.score;
        }
        if (psdoc && psdoc.status) {
            this.iconPath = path.join(__dirname, '..', 'res', 'icons', utils.statusIcon[psdoc.status] + '.svg');
            tooltipDoc.appendMarkdown(`- **Status**: ${utils.statusName[psdoc.status]}\n`);
            this.description += ' ' + utils.statusName[psdoc.status];
        }
        if (pdoc.difficulty) { tooltipDoc.appendMarkdown(`- **Difficulty**: ${pdoc.difficulty}\n`); }
        if (pdoc.nAccept && pdoc.nSubmit) { tooltipDoc.appendMarkdown(`- **AC / Tried**: ${pdoc.nAccept}/${pdoc.nSubmit}\n`); }
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'cyezoi.openP',
            title: 'Open Problem',
            arguments: (tid ? [pdoc.docId, tid] : [pdoc.docId]),
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
