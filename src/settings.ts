import * as vscode from 'vscode';
import { outputChannel } from './io';

export default class settings {
    private static get(key: string): unknown {
        const value = settings.configuration.get(key);
        outputChannel.trace('[settings]', `"${key}"`, 'get', `"${value}"`);
        return value;
    }

    static get configuration(): vscode.WorkspaceConfiguration { return vscode.workspace.getConfiguration('hydro'); }
    static get server(): string { return settings.get('server.server') as string; }
    static get safeProtocol(): boolean { return settings.get('server.safeProtocol') as boolean; }
    static get domain(): string { return settings.get('server.domain') as string; }
    static async setDomain(value: string) {
        outputChannel.trace('[settings]', '"set server.domain"', value);
        await settings.configuration.update('server.domain', value.toString());
    }
    static get webviewColumn(): vscode.ViewColumn { return settings.get('userInterface.webviewColumn') as vscode.ViewColumn; }
}
