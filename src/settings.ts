import * as vscode from 'vscode';
import { outputChannel } from './io';

export default class {
    static get server(): string {
        outputChannel.trace('[settings]', '"server"');
        return vscode.workspace.getConfiguration('cyezoi').get('server') as string;
    }
    static get safeProtocol(): boolean {
        outputChannel.trace('[settings]', '"safeProtocol"');
        return vscode.workspace.getConfiguration('cyezoi').get('safeProtocol') as boolean;
    }
    static get domain(): string {
        outputChannel.trace('[settings]', '"domain"');
        return vscode.workspace.getConfiguration('cyezoi').get('domain') as string;
    }
}
