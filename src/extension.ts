import * as vscode from 'vscode';
import { cyezoiAuthenticationProvider } from './authenticationProvider';
import { cyezoiFetch } from './fetch';
import { outputChannel, io } from './io';
import { WebSocket } from 'ws';
import { cyezoiStorage } from './storage';
import { statusEnded, statusName } from './static';
import { recordWebview } from './recordWebview';
import { problemWebview } from './problemWebview';
import { cyezoiSettings } from './settings';
import { cyezoiProblemTreeDataProvider } from './problemTreeDataProvider';
import { cyezoiRecordTreeDataProvider } from './recordTreeDataProvider';
import { cyezoiContestTreeDataProvider } from './contestTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	cyezoiStorage.secretStorage = context.secrets;

	const disposables: vscode.Disposable[] = [];
	context.subscriptions.push(new vscode.Disposable(() => vscode.Disposable.from(...disposables).dispose()));

	disposables.push(outputChannel);
	disposables.push(vscode.authentication.registerAuthenticationProvider('cyezoi', 'CYEZOI', new cyezoiAuthenticationProvider(), {
		supportsMultipleAccounts: false,
	}));

	disposables.push(vscode.commands.registerCommand('cyezoi.login', async () => {
		const session = await vscode.authentication.getSession(cyezoiAuthenticationProvider.id, [], { createIfNone: true });
		if (!session) { return; }
		const response = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Checking your login status...',
			cancellable: true,
		}, async (progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => {
				abortController.abort();
			});
			return new cyezoiFetch({ path: '/', addCookie: true, abortController, ignoreLogin: true }).start();
		});
		const userContext = response.json.UserContext;
		if (userContext._id === 0) {
			cyezoiStorage.token = undefined;
			cyezoiStorage.name = undefined;
			vscode.commands.executeCommand('cyezoi.login');
			io.warn('Login expired, please login again.');
			return;
		}
		io.info(`Hi ${session.account.label}, you have successfully logged in!`);
		vscode.commands.executeCommand('cyezoi.refreshProblemTree');
		vscode.commands.executeCommand('cyezoi.refreshRecordTree');
		vscode.commands.executeCommand('cyezoi.refreshContestTree');
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.logout', async () => {
		io.warn('Please go to the Accounts tab (generally on the bottom left corner of the window) and log out from there.', {
			modal: true,
		});
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openProblem', async (pid: vscode.TreeItem | string | undefined, cid?: string) => {
		if (pid instanceof vscode.TreeItem) {
			pid = undefined;
		}
		if (pid === undefined) {
			pid = await io.input('Please input the problem ID');
			if (pid === undefined) {
				return;
			}
		};
		new problemWebview(context.extensionPath, pid, cid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.submitProblem', async (pid: vscode.TreeItem | string | undefined) => {
		if (pid instanceof vscode.TreeItem) {
			pid = pid.command?.arguments?.[0];
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
			return await new cyezoiFetch({ path: '/d/' + cyezoiSettings.domain + '/p/' + pid + '/submit', addCookie: true, abortController }).start();
		}).then(response => response.json.langRange);

		const lastLanguage = await cyezoiStorage.lastLanguage;
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
		cyezoiStorage.lastLanguage = lang;

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
			const response = await new cyezoiFetch({
				path: `/d/${cyezoiSettings.domain}/p/${pid}/submit`,
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
				const ws = new WebSocket(`wss://${cyezoiSettings.server}/record-detail-conn?domainId=${cyezoiSettings.domain}&rid=${rid}`, {
					headers: {
						'cookie': await cyezoiFetch.getCookiesValue(),
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
					progress.report({ message: statusName[responseJSON.status] });
					if (statusEnded[responseJSON.status]) {
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
			vscode.commands.executeCommand('cyezoi.openRecord', rid);
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openRecord', async (rid: vscode.TreeItem | string | undefined) => {
		if (rid instanceof vscode.TreeItem) {
			rid = undefined;
		}
		if (rid === undefined) {
			rid = await io.input('Please input the RID');
			if (rid === undefined) {
				return;
			}
		}
		new recordWebview(context.extensionPath, rid);
	}));

	disposables.push(vscode.window.registerTreeDataProvider('cyezoiProblemTreeView', new cyezoiProblemTreeDataProvider()));
	disposables.push(vscode.window.registerTreeDataProvider('cyezoiRecordTreeView', new cyezoiRecordTreeDataProvider()));
	disposables.push(vscode.window.registerTreeDataProvider('cyezoiContestTreeView', new cyezoiContestTreeDataProvider()));

	outputChannel.info('Extension activated');
}

export function deactivate() {
	outputChannel.info('Extension deactivated');
}
