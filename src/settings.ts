import * as vscode from 'vscode';

export class cyezoiSettings {
    static get server(): string {
        return vscode.workspace.getConfiguration('cyezoi').get('server') as string;
    }
    static get domain(): string {
        return vscode.workspace.getConfiguration('cyezoi').get('domain') as string;
    }
}
