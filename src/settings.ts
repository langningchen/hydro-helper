import * as vscode from 'vscode';
import { outputChannel } from './io';

export default class {
    static get server(): string {
        outputChannel.trace('[settings]', '"get server"');
        return vscode.workspace.getConfiguration('cyezoi').get('server') as string;
    }
    static get safeProtocol(): boolean {
        outputChannel.trace('[settings]', '"get safeProtocol"');
        return vscode.workspace.getConfiguration('cyezoi').get('safeProtocol') as boolean;
    }
    static get domain(): string {
        outputChannel.trace('[settings]', '"get domain"');
        return vscode.workspace.getConfiguration('cyezoi').get('domain') as string;
    }
    static async setDomain(value: string) {
        outputChannel.trace('[settings]', '"set domain"', arguments);
        await vscode.workspace.getConfiguration('cyezoi').update('domain', value.toString());
    }
}
