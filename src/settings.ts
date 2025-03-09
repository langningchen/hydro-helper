import * as vscode from 'vscode';
import { outputChannel } from './io';

export default class settings {
    static get configuration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('hydro');
    }
    static get server(): string {
        outputChannel.trace('[settings]', '"get server.server"');
        return settings.configuration.get('server.server') as string;
    }
    static get safeProtocol(): boolean {
        outputChannel.trace('[settings]', '"get server.safeProtocol"');
        return settings.configuration.get('server.safeProtocol') as boolean;
    }
    static get domain(): string {
        outputChannel.trace('[settings]', '"get server.domain"');
        return settings.configuration.get('server.domain') as string;
    }
    static async setDomain(value: string) {
        outputChannel.trace('[settings]', '"set server.domain"', arguments);
        await settings.configuration.update('server.domain', value.toString());
    }
    static get webviewColumn(): vscode.ViewColumn {
        outputChannel.trace('[settings]', '"get webviewColumn"');
        return settings.configuration.get('userInterface.webviewColumn') as vscode.ViewColumn;
    }
}
