import * as vscode from 'vscode';
import { outputChannel } from './io';

export default class settings {
    static get configuration() {
        outputChannel.trace('[settings]', '"get configuration"');
        return vscode.workspace.getConfiguration('hydro');
    }
    static get server(): string {
        outputChannel.trace('[settings]', '"get server"');
        return settings.configuration.get('server') as string;
    }
    static get safeProtocol(): boolean {
        outputChannel.trace('[settings]', '"get safeProtocol"');
        return settings.configuration.get('safeProtocol') as boolean;
    }
    static get domain(): string {
        outputChannel.trace('[settings]', '"get domain"');
        return settings.configuration.get('domain') as string;
    }
    static async setDomain(value: string) {
        outputChannel.trace('[settings]', '"set domain"', arguments);
        await settings.configuration.update('domain', value.toString());
    }
}
