import * as vscode from 'vscode';
import { cyezoiFetch } from './fetch';
import { io, outputChannel } from './io';
import { cyezoiStorage } from './storage';


class cyezoiSession implements vscode.AuthenticationSession {
    account = { id: cyezoiAuthenticationProvider.id, label: 'CYEZOI' };
    readonly id = cyezoiAuthenticationProvider.id;
    readonly scopes = [];

    constructor(public readonly accessToken: string, label?: string) {
        this.account.label = label || this.account.label;
    }
}

export class cyezoiAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {
    static id = 'cyezoi';
    private static usernameKey = 'usernameKey';
    private static passwordKey = 'passwordKey';
    private static tokenKey = 'cyezoiToken';
    private static nameKey = 'cyezoiName';

    private currentToken: Thenable<string | undefined> | undefined;
    private currentName: Thenable<string | undefined> | undefined;
    private initializedDisposable: vscode.Disposable | undefined;

    private _onDidChangeSessions = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
    get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
        return this._onDidChangeSessions.event;
    }

    dispose(): void {
        this.initializedDisposable?.dispose();
    }

    private ensureInitialized(): void {
        if (this.initializedDisposable === undefined) {
            void this.cacheTokenFromStorage();

            this.initializedDisposable = vscode.Disposable.from(
                vscode.authentication.onDidChangeSessions(e => {
                    if (e.provider.id === cyezoiAuthenticationProvider.id) {
                        void this.checkForUpdates();
                    }
                }),
            );
        }
    }

    private async checkForUpdates(): Promise<void> {
        const added: vscode.AuthenticationSession[] = [];
        const removed: vscode.AuthenticationSession[] = [];
        const changed: vscode.AuthenticationSession[] = [];

        const previousToken = await this.currentToken;
        const session = (await this.getSessions())[0];

        if (session?.accessToken && !previousToken) {
            added.push(session);
        } else if (!session?.accessToken && previousToken) {
            removed.push(session);
        } else if (session?.accessToken !== previousToken) {
            changed.push(session);
        } else {
            return;
        }

        void this.cacheTokenFromStorage();
        this._onDidChangeSessions.fire({ added: added, removed: removed, changed: changed });
    }

    private cacheTokenFromStorage() {
        this.currentToken = cyezoiStorage.token;
        return this.currentToken;
    }

    private cacheNameFromStorage() {
        this.currentName = cyezoiStorage.name;
        return this.currentName;
    }

    async getSessions(scopes?: readonly string[], options?: vscode.AuthenticationProviderSessionOptions): Promise<vscode.AuthenticationSession[]> {
        outputChannel.trace('[authenticationProvider]', '"getSessions"', arguments);
        this.ensureInitialized();
        const token = await this.cacheTokenFromStorage();
        const name = await this.cacheNameFromStorage();

        if (!token || !name) {
            return [];
        }

        return [new cyezoiSession(token, name)];
    }

    async createSession(_scopes: string[]): Promise<vscode.AuthenticationSession> {
        outputChannel.trace('[authenticationProvider]', '"createSession"', arguments);
        this.ensureInitialized();
        return new Promise(async (resolve, reject) => {
            try {
                var uname: string | undefined = await cyezoiStorage.username;
                var password: string | undefined = await cyezoiStorage.password;
                if (!uname || !password) {
                    uname = await io.input('Please input your username');
                    password = await io.input('Please input your password', {
                        password: true,
                    });
                }
                if (!uname || !password) {
                    throw new Error('Username or password not provided');
                }

                const sid = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Logging in...',
                    cancellable: true,
                }, async (progress, token) => {
                    const abortController = new AbortController();
                    token.onCancellationRequested(() => {
                        abortController.abort();
                    });
                    const response = await new cyezoiFetch({ path: '/login', body: { uname, password }, addCookie: false, abortController, returnError: true }).start();
                    if (response.error) {
                        cyezoiStorage.username = undefined;
                        cyezoiStorage.password = undefined;
                        throw response.error;
                    }
                    if (!response.cookies) {
                        throw new Error('Failed to create session');
                    }
                    return response.cookies[0].split(';')[0].split('=')[1];
                });

                cyezoiStorage.username = uname;
                cyezoiStorage.password = password;
                cyezoiStorage.token = sid;
                cyezoiStorage.name = uname;
                this._onDidChangeSessions.fire({ added: [new cyezoiSession(sid, uname)], removed: [], changed: [] });
                resolve(await new cyezoiSession(sid, uname));
            }
            catch (e) {
                reject(e);
            }
        });
    }

    async removeSession(_sessionId: string): Promise<void> {
        outputChannel.trace('[authenticationProvider]', '"removeSession"', arguments);
        const token = await this.currentToken;
        const name = await this.currentName;
        if (!token || !name) {
            return;
        }
        cyezoiStorage.token = undefined;
        cyezoiStorage.name = undefined;
        this._onDidChangeSessions.fire({ added: [], removed: [new cyezoiSession(token, name)], changed: [] });;
    }
}
