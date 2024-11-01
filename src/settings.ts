import * as vscode from 'vscode';
import { outputChannel } from './io';

export class cyezoiSettings {
    static get server(): string {
        outputChannel.trace(__filename, 'server');
        return vscode.workspace.getConfiguration('cyezoi').get('server') as string;
    }
    static get domain(): string {
        outputChannel.trace(__filename, 'domain');
        return vscode.workspace.getConfiguration('cyezoi').get('domain') as string;
    }
}
