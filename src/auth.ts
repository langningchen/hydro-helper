import * as vscode from 'vscode';
import fetch from './fetch';
import { io, outputChannel } from './io';
import storage from './storage';
import { formatString } from './utils';

class cyezoiSession implements vscode.AuthenticationSession {
    account = { id: auth.id, label: 'CYEZOI' };
    readonly id = auth.id;
    readonly scopes = [];

    constructor(public readonly accessToken: string, label?: string) {
        this.account.label = label || this.account.label;
    }
}

export default class auth implements vscode.AuthenticationProvider, vscode.Disposable {
    static id = 'cyezoi';

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

    static getCookiesValue = async (): Promise<string> => {
        return 'sid=' + (await vscode.authentication.getSession('cyezoi', ['cyezoi']).then((session: vscode.AuthenticationSession | undefined) => {
            if (!session) {
                return '';
            }
            return session.accessToken;
        }));
    };

    private ensureInitialized(): void {
        if (this.initializedDisposable === undefined) {
            void this.cacheTokenFromStorage();

            this.initializedDisposable = vscode.Disposable.from(
                vscode.authentication.onDidChangeSessions(e => {
                    if (e.provider.id === auth.id) {
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
        this.currentToken = storage.token;
        return this.currentToken;
    }

    private cacheNameFromStorage() {
        this.currentName = storage.name;
        return this.currentName;
    }

    async getSessions(scopes?: readonly string[], options?: vscode.AuthenticationProviderSessionOptions): Promise<vscode.AuthenticationSession[]> {
        outputChannel.trace('[auth    ]', '"getSessions"', arguments);
        this.ensureInitialized();
        const token = await this.cacheTokenFromStorage();
        const name = await this.cacheNameFromStorage();

        if (!token || !name) {
            return [];
        }

        return [new cyezoiSession(token, name)];
    }

    async createSession(_scopes: string[]): Promise<vscode.AuthenticationSession> {
        outputChannel.trace('[auth    ]', '"createSession"', arguments);
        this.ensureInitialized();
        return new Promise(async (resolve, reject) => {
            try {
                var uname: string | undefined = await storage.username;
                var password: string | undefined = await storage.password;
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
                    const response = await new fetch({ path: '/login', body: { uname, password }, addCookie: false, abortController, returnError: true, ignoreLogin: true }).start();
                    if (response.json.error) {
                        storage.username = undefined;
                        storage.password = undefined;
                        auth.setLoggedIn(false);
                        throw new Error(formatString(response.json.error));
                    }
                    if (!response.cookies) {
                        throw new Error('Failed to create session');
                    }
                    return response.cookies[0].split(';')[0].split('=')[1];
                });

                storage.username = uname;
                storage.password = password;
                storage.token = sid;
                storage.name = uname;
                this._onDidChangeSessions.fire({ added: [new cyezoiSession(sid, uname)], removed: [], changed: [] });
                resolve(new cyezoiSession(sid, uname));
            }
            catch (e) {
                io.error((e as Error).message);
                reject(e);
            }
        });
    }

    async removeSession(_sessionId: string): Promise<void> {
        outputChannel.trace('[auth    ]', '"removeSession"', arguments);
        const token = await this.currentToken;
        const name = await this.currentName;
        if (!token || !name) {
            return;
        }
        auth.setLoggedIn(false);
        this._onDidChangeSessions.fire({ added: [], removed: [new cyezoiSession(token, name)], changed: [] });;
    }

    static async getLoginStatus(): Promise<boolean> {
        var isLoggedIn = false;
        const session = await vscode.authentication.getSession(this.id, []);
        if (session !== undefined) {
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Checking your login status...',
                cancellable: true,
            }, async (progress, token) => {
                const abortController = new AbortController();
                token.onCancellationRequested(() => {
                    abortController.abort();
                });
                return new fetch({ path: '/', addCookie: true, abortController, ignoreLogin: true }).start();
            });
            isLoggedIn = response.json.UserContext._id !== 0;
        }
        return isLoggedIn;
    }
    static setLoggedIn(isLoggedIn: boolean): void {
        vscode.commands.executeCommand('setContext', 'cyezoi-helper.loggedIn', isLoggedIn);
        if (isLoggedIn) {
            vscode.commands.executeCommand('cyezoi.refreshPTree');
            vscode.commands.executeCommand('cyezoi.refreshRTree');
            vscode.commands.executeCommand('cyezoi.refreshCTree');
        } else {
            storage.token = undefined;
            storage.name = undefined;
        }
    }
}
