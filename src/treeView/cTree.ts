import * as vscode from 'vscode';
import * as utils from '../utils';
import fetch from '../fetch';
import settings from '../settings';
import treeView from './treeView';
import { Record } from './rTree';
import { Problem } from './pTree';

export default class extends treeView<Contest | Problem | Record> {
    constructor(homework: boolean = false) {
        const type = homework ? 'homework' : 'contest';
        super(type, async ({ page, setPageCounter, element }) => {
            if (!element) {
                const response = await new fetch({ path: `/d/${settings.domain}/${type}?page=${page}` }).start();
                setPageCounter(response.json.tpcount);
                const contests: Contest[] = [];
                for (const tdoc of response.json.tdocs) {
                    contests.push(new Contest(type, tdoc));
                }
                return contests;
            } else if (element.contextValue === type) {
                const tid = (element as Contest).id!;
                const response = await new fetch({ path: `/d/${settings.domain}/${type}/${tid}${type === 'contest' ? '/problems' : ''}` }).start();
                const problems: Problem[] = [];
                for (const pdoc of Object.keys(response.json.pdict)) {
                    if (parseInt(pdoc) === response.json.pdict[pdoc].docId) {
                        problems.push(new Problem(response.json.pdict[pdoc], response.json.psdict[pdoc], tid));
                    }
                }
                return problems;
            } else {
                const [tid, pid] = (element as Problem).id!.split('-');
                const response = await new fetch({ path: `/d/${settings.domain}/${type}/${tid}${type === 'contest' ? '/problems' : ''}` }).start();
                const records: Record[] = [];
                for (const i in response.json.rdict) {
                    const rdoc = response.json.rdict[i];
                    if (rdoc.pid === parseInt(pid)) {
                        records.push(new Record(rdoc, response.json.pdict[rdoc.pid], response.json.udict[rdoc.uid]));
                    }
                }
                return records;
            }
        });
    }
}

export class Contest extends vscode.TreeItem {
    constructor(type: string, tdoc: utils.ContestDoc) {
        super(tdoc.title, vscode.TreeItemCollapsibleState.Collapsed);
        this.id = tdoc._id;
        this.contextValue = type;
        this.description = utils.toTime(new Date(tdoc.endAt).getTime() - new Date(tdoc.beginAt).getTime());
        const tooltipDoc = new vscode.MarkdownString();
        tooltipDoc.appendMarkdown(`- **Rule**: ${utils.contestRuleName[tdoc.rule]}\n`);
        tooltipDoc.appendMarkdown(`- **Attend**: ${tdoc.attend} people\n`);
        tooltipDoc.appendMarkdown(`- **Begin At**: ${utils.toRelativeTime(new Date(tdoc.beginAt).getTime())}\n`);
        tooltipDoc.appendMarkdown(`- **End At**: ${utils.toRelativeTime(new Date(tdoc.endAt).getTime())}\n`);
        tooltipDoc.appendMarkdown(`- **Rated**: ${tdoc.rated ? 'Yes' : 'No'}\n`);
        if (tdoc.allowViewCode !== undefined) {
            tooltipDoc.appendMarkdown(`- **Allow View Code**: ${tdoc.allowViewCode ? 'Yes' : 'No'}\n`);
        }
        this.tooltip = tooltipDoc;
        this.command = {
            command: 'hydro-helper.open' + type.toUpperCase().charAt(0),
            title: 'Open ' + type.toUpperCase(),
            arguments: [tdoc._id],
        };
    }
}
