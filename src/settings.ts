import * as vscode from 'vscode';
import { outputChannel } from './io';

export default class {
    static get server(): string {
        outputChannel.trace('[settings]', '"get server.server"');
        return vscode.workspace.getConfiguration('server').get('server') as string;
    }
    static get safeProtocol(): boolean {
        outputChannel.trace('[settings]', '"get server.safeProtocol"');
        return vscode.workspace.getConfiguration('server').get('safeProtocol') as boolean;
    }
    static get domain(): string {
        outputChannel.trace('[settings]', '"get server.domain"');
        return vscode.workspace.getConfiguration('server').get('domain') as string;
    }
    static async setDomain(value: string) {
        outputChannel.trace('[settings]', '"set server.domain"', arguments);
        await vscode.workspace.getConfiguration('server').update('domain', value.toString());
    }
}
