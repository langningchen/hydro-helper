import * as vscode from 'vscode';
import settings from './settings';

export default class {
    private file: vscode.Uri;
    private content: string = "";
    public attributes: Map<string, string> = new Map();

    constructor(file: vscode.Uri) {
        this.file = file;
    };

    public load = async (): Promise<void> => {
        if (!settings.loadAttributes) return;
        this.content = await vscode.workspace.fs.readFile(this.file).then(data => {
            return new TextDecoder().decode(data);
        });
        const regex = /@(\S+)\s+(\S+)/g;
        let match: RegExpExecArray;
        while ((match = regex.exec(this.content)) !== null) {
            this.attributes.set(match[1], match[2]);
        }
    };

    public save = async (): Promise<void> => {
        if (!settings.saveAttributes) return;
        const regex = /((?<=\n))[ \t]*\/\/( @[a-zA-Z]* [a-zA-Z0-\\.]*)+\n?/g;
        this.content = this.content.replaceAll(regex, '').trimEnd();
        this.content += '\n';
        if (this.content.length > 0) {
            this.content += '\n// ';
            this.attributes.forEach((value, key) => { this.content += `@${key} ${value} `; });
            this.content = this.content.trimEnd();
            this.content += '\n';
        }
        await vscode.workspace.fs.writeFile(this.file, new TextEncoder().encode(this.content));
    };
}
