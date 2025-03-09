import * as vscode from 'vscode';
import { outputChannel } from './io';

export default class {
    static get server(): string {
        outputChannel.trace('[settings]', '"get server.server"');
        return vscode.workspace.getConfiguration('hydro').get('server.server') as string;
    }
    static get safeProtocol(): boolean {
        outputChannel.trace('[settings]', '"get server.safeProtocol"');
        return vscode.workspace.getConfiguration('hydro').get('server.safeProtocol') as boolean;
    }
    static get domain(): string {
        outputChannel.trace('[settings]', '"get server.domain"');
        return vscode.workspace.getConfiguration('hydro').get('server.domain') as string;
    }
    static async setDomain(value: string) {
        outputChannel.trace('[settings]', '"set server.domain"', arguments);
        await vscode.workspace.getConfiguration('hydro').update('server.domain', value.toString());
    }
}
