import * as vscode from 'vscode';
import * as utils from './utils';
import auth from './auth';
import fetch from './fetch';
import { outputChannel, io } from './io';
import { WebSocket } from 'ws';
import storage from './storage';
import rWeb from './rWeb';
import pWeb from './pWeb';
import cWeb from './cWeb';
import settings from './settings';
import pTree from './pTree';
import rTree from './rTree';
import cTree from './cTree';

export async function activate(context: vscode.ExtensionContext) {
	storage.secretStorage = context.secrets;

	const disposables: vscode.Disposable[] = [];
	context.subscriptions.push(new vscode.Disposable(() => vscode.Disposable.from(...disposables).dispose()));

	disposables.push(outputChannel);
	disposables.push(vscode.authentication.registerAuthenticationProvider('cyezoi', 'CYEZOI', new auth(), {
		supportsMultipleAccounts: false,
	}));

	disposables.push(vscode.commands.registerCommand('cyezoi.login', async () => {
		const session = await vscode.authentication.getSession(auth.id, [], { createIfNone: true });
		if (!session) {
			auth.setLoggedIn(false);
			return;
		}
		const isLoggedIn = await auth.getLoginStatus();
		auth.setLoggedIn(isLoggedIn);
		if (isLoggedIn) {
			io.info(`Hi ${session.account.label}, you have successfully logged in!`);
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.logout', async () => {
		io.warn('Please go to the Accounts tab (generally on the bottom left corner of the window) and log out from there.', {
			modal: true,
		});
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.submitProblem', async (pid: vscode.TreeItem | string | undefined) => {
		var tid: string | undefined;
		if (pid instanceof vscode.TreeItem) {
			const args = pid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[pid, tid] = args;
			}
		}
		if (pid === undefined) {
			pid = await io.input('Please input the problem ID', {
				value: vscode.window.activeTextEditor?.document.fileName.match(/\d+/)?.[0],
			});
			if (pid === undefined) {
				return;
			}
		}

		const langs = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Getting language list...',
			cancellable: true,
		}, async (progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => {
				abortController.abort();
			});
			return await new fetch({
				path: '/d/' + settings.domain + '/p/' + pid + '/submit' + (tid ? '?tid=' + tid : ''),
				addCookie: true, abortController
			}).start();
		}).then(response => response.json.langRange);

		const lastLanguage = await storage.lastLanguage;
		const lang = (await vscode.window.showQuickPick(Object.keys(langs).map(key => ({
			label: langs[key],
			description: key,
		})).sort((a, b) => {
			if (a.description === lastLanguage) {
				return -1;
			}
			if (b.description === lastLanguage) {
				return 1;
			}
			return 0;
		}), {
			title: 'Select the language',
		}))?.description;
		if (lang === undefined) {
			return;
		}
		storage.lastLanguage = lang;

		const file = await vscode.window.showOpenDialog({
			title: 'Select the source code file',
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			openLabel: 'Submit',
			defaultUri: vscode.window.activeTextEditor ? vscode.Uri.file(vscode.window.activeTextEditor.document.fileName) : undefined,
		});
		if (file === undefined) {
			return;
		}
		const code = await vscode.workspace.fs.readFile(file[0]);

		const rid = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Judging',
			cancellable: false,
		}, async (progress) => {
			progress.report({ message: 'Submitting' });
			const response = await new fetch({
				path: `/d/${settings.domain}/p/${pid}/submit` + (tid ? '?tid=' + tid : ''),
				body: {
					lang,
					code: code.toString(),
				},
				addCookie: true,
			}).start();
			const rid = response.json.rid;
			if (rid === undefined) {
				io.error('Submit failed');
				return;
			}
			progress.report({ message: 'Waiting for judge response' });

			return new Promise<number>(async (resolve) => {
				const ws = new WebSocket(`wss://${settings.server}/record-detail-conn?domainId=${settings.domain}&rid=${rid}`, {
					headers: {
						'cookie': await auth.getCookiesValue(),
					},
				});

				var interval: NodeJS.Timeout;
				ws.on('open', function open() {
					interval = setInterval(() => {
						ws.send('ping');
					}, 3e4);
				});

				ws.on('message', (data) => {
					const stringData = data.toString();
					if (stringData === 'ping') {
						ws.send('pong');
						return;
					}
					if (stringData === 'pong') {
						return;
					}
					const responseJSON = JSON.parse(stringData);
					if (responseJSON.error === 'PermissionError' || responseJSON.error === 'PrivilegeError') {
						ws.close();
					}
					progress.report({ message: utils.statusName[responseJSON.status] });
					if (utils.statusEnded[responseJSON.status]) {
						ws.emit('close', 0, 'CYEZOI: Judged');
					}
				});

				ws.on('error', function error(err) {
					io.error(err.toString());
				});

				ws.on('close', (code, reason) => {
					clearInterval(interval);
					resolve(rid);
				});
			});

		});

		if (rid !== undefined) {
			vscode.commands.executeCommand('cyezoi.openT', rid);
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.attendC', async (tid: string | undefined) => {
		if (tid === undefined) {
			tid = await io.input('Please input the contest ID');
			if (tid === undefined) {
				return;
			}
		};
		await new fetch({
			path: `/d/${settings.domain}/contest/${tid}`, addCookie: true,
			body: {
				"operation": "attend",
			},
		}).start();
		io.info('Contest attended');
		vscode.commands.executeCommand('cyezoi.refreshCTree');
	}));

	disposables.push(vscode.commands.registerCommand('cyezoi.openP', async (pid: vscode.TreeItem | string | undefined, tid?: string) => {
		if (pid instanceof vscode.TreeItem) {
			pid = undefined;
		}
		if (pid === undefined) {
			pid = await io.input('Please input the problem ID', {
				value: vscode.window.activeTextEditor?.document.fileName.match(/\d+/)?.[0],
			});
			if (pid === undefined) {
				return;
			}
		};
		new pWeb(context.extensionPath, pid, tid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openT', async (rid: vscode.TreeItem | string | undefined) => {
		if (rid instanceof vscode.TreeItem) {
			rid = undefined;
		}
		if (rid === undefined) {
			rid = await io.input('Please input the RID');
			if (rid === undefined) {
				return;
			}
		}
		new rWeb(context.extensionPath, rid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openC', async (tid: vscode.TreeItem | string | undefined) => {
		if (tid instanceof vscode.TreeItem) {
			tid = undefined;
		}
		if (tid === undefined) {
			tid = await io.input('Please input the contest ID');
			if (tid === undefined) {
				return;
			}
		}
		new cWeb(context.extensionPath, tid);
	}));

	disposables.push(vscode.window.registerTreeDataProvider('pTree', new pTree()));
	disposables.push(vscode.window.registerTreeDataProvider('rTree', new rTree()));
	disposables.push(vscode.window.registerTreeDataProvider('cTree', new cTree()));


	auth.setLoggedIn(await auth.getLoginStatus());

	outputChannel.info('Extension activated');
}

export function deactivate() {
	outputChannel.info('Extension deactivated');
}
