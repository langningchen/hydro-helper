import * as vscode from 'vscode';
import fetch from './fetch';
import { io, outputChannel } from './io';
import storage from './storage';
import { formatString } from './utils';

class hydroSession implements vscode.AuthenticationSession {
    account = { id: auth.id, label: 'Hydro' };
    readonly id = auth.id;
    readonly scopes = [];

    constructor(public readonly accessToken: string, label?: string) {
        this.account.label = label || this.account.label;
    }
}

export default class auth implements vscode.AuthenticationProvider, vscode.Disposable {
    static id = 'hydro';

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
        return 'sid=' + (await vscode.authentication.getSession('hydro', ['hydro']).then((session: vscode.AuthenticationSession | undefined) => {
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

        if (session?.accessToken && !previousToken) { added.push(session); }
        else if (!session?.accessToken && previousToken) { removed.push(session); }
        else if (session?.accessToken !== previousToken) { changed.push(session); }
        else { return; }

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

    async getSessions(): Promise<vscode.AuthenticationSession[]> {
        outputChannel.trace('[auth    ]', '"getSessions"');
        this.ensureInitialized();
        const token = await this.cacheTokenFromStorage();
        const name = await this.cacheNameFromStorage();

        if (!token || !name) {
            return [];
        }

        return [new hydroSession(token, name)];
    }

    async createSession(): Promise<vscode.AuthenticationSession> {
        outputChannel.trace('[auth    ]', '"createSession"');
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    let uname: string | undefined = await storage.username;
                    let password: string | undefined = await storage.password;
                    if (!uname || !password) {
                        uname = await io.input('Please input your username');
                        password = await io.input('Please input your password', {
                            password: true,
                        });
                    }
                    if (!uname || !password) {
                        throw new Error('Username or password not provided');
                    }
                    const rememberme = (await vscode.window.showQuickPick(['Yes', 'No'], {
                        placeHolder: 'Do you want to remember this session?',
                    })) === 'Yes';

                    const sid = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Logging in...',
                        cancellable: true,
                    }, async (_progress, token) => {
                        const abortController = new AbortController();
                        token.onCancellationRequested(() => { abortController.abort(); });
                        const response = await new fetch({
                            path: '/login', body: { uname, password, rememberme, }, addCookie: false, abortController, returnError: true, ignoreLogin: true
                        }).start();
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
                    this._onDidChangeSessions.fire({ added: [new hydroSession(sid, uname)], removed: [], changed: [] });
                    resolve(new hydroSession(sid, uname));
                }
                catch (e) {
                    reject(e);
                }
            })();
        });
    }

    async removeSession(): Promise<void> {
        outputChannel.trace('[auth    ]', '"removeSession"');
        const token = await this.currentToken;
        const name = await this.currentName;
        if (!token || !name) { return; }
        auth.setLoggedIn(false);
        this._onDidChangeSessions.fire({ added: [], removed: [new hydroSession(token, name)], changed: [] });;
    }

    static async getLoginStatus(): Promise<boolean> {
        let isLoggedIn = false;
        const session = await vscode.authentication.getSession(this.id, []);
        if (session !== undefined) {
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Checking your login status...',
                cancellable: true,
            }, async (_progress, token) => {
                const abortController = new AbortController();
                token.onCancellationRequested(() => { abortController.abort(); });
                return new fetch({ path: '/', abortController, ignoreLogin: true }).start();
            });
            isLoggedIn = !response.json.url?.includes('/login');
        }
        return isLoggedIn;
    }
    static setLoggedIn(isLoggedIn: boolean): void {
        vscode.commands.executeCommand('setContext', 'hydro-helper.loggedIn', isLoggedIn);
        if (isLoggedIn) {
            vscode.commands.executeCommand('hydro-helper.refreshPTree');
            vscode.commands.executeCommand('hydro-helper.refreshRTree');
            vscode.commands.executeCommand('hydro-helper.refreshCTree');
            vscode.commands.executeCommand('hydro-helper.refreshHTree');
        } else {
            storage.token = undefined;
            storage.name = undefined;
        }
    }
}
