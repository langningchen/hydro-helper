import * as vscode from 'vscode';
import { outputChannel } from './io';

class storage {
    secretStorage: vscode.SecretStorage | undefined;
    private async get(key: string): Promise<string | undefined> {
        outputChannel.trace('[storage ]', '"' + key + '"', 'get');
        return this.secretStorage!.get(key);
    }
    private async store(key: string, value: string | undefined): Promise<void> {
        if (!value) {
            outputChannel.trace('[storage ]', '"' + key + '"', 'delete');
            this.secretStorage!.delete(key);
        } else {
            outputChannel.trace('[storage ]', '"' + key + '"', 'store');
            this.secretStorage!.store(key, value);
        }
    }
    get username(): Thenable<string | undefined> { return this.get('usernameKey'); }
    set username(value: string | undefined) { this.store('usernameKey', value); }
    get password(): Thenable<string | undefined> { return this.get('passwordKey'); }
    set password(value: string | undefined) { this.store('passwordKey', value); }
    get token(): Thenable<string | undefined> { return this.get('cyezoiToken'); }
    set token(value: string | undefined) { this.store('cyezoiToken', value); }
    get name(): Thenable<string | undefined> { return this.get('cyezoiName'); }
    set name(value: string | undefined) { this.store('cyezoiName', value); }
    get lastLanguage(): Thenable<string | undefined> { return this.get('lastLanguage'); }
    set lastLanguage(value: string | undefined) { this.store('lastLanguage', value); }
    get extensionPath(): Thenable<string | undefined> { return this.get('extensionPath'); }
    set extensionPath(value: string | undefined) { this.store('extensionPath', value); }
}

export default new storage();
