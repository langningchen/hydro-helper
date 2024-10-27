import * as vscode from 'vscode';
import { cyezoiAuthenticationProvider } from './authenticationProvider';
import { outputChannel } from './outputChannel';
import { cyezoiFetch } from './fetch';
import { io } from './io';
import { WebSocket } from 'ws';
import { cyezoiStorage } from './storage';
import { statusEnded, statusName } from './static';
import { submissionWebview } from './submissionWebview';
import { problemWebview } from './problemWebview';
import { cyezoiTreeDataProvider } from './treeDataProvider';
import { cyezoiSettings } from './settings';

export function activate(context: vscode.ExtensionContext) {
	cyezoiStorage.secretStorage = context.secrets;

	const disposables: vscode.Disposable[] = [];
	context.subscriptions.push(new vscode.Disposable(() => vscode.Disposable.from(...disposables).dispose()));

	disposables.push(outputChannel);
	disposables.push(vscode.commands.registerCommand('cyezoi.openOutput', () => {
		outputChannel.show();
	}));

	disposables.push(vscode.authentication.registerAuthenticationProvider('cyezoi', 'CYEZOI', new cyezoiAuthenticationProvider()));
	disposables.push(vscode.commands.registerCommand('cyezoi.login', async () => {
		io.log('cyezoi.login');
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
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.logout', async () => {
		io.warn('Please go to the Accounts tab (generally on the bottom left corner of the window) and log out from there.', {
			modal: true,
		});
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openProblem', async (problemId: vscode.TreeItem | string | undefined) => {
		if (problemId instanceof vscode.TreeItem) {
			problemId = undefined;
		}
		if (problemId === undefined) {
			problemId = await io.input('Please input the problem ID');
			if (problemId === undefined) {
				return;
			}
		};
		new problemWebview(problemId, context.extensionPath);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.submitProblem', async (problemId: vscode.TreeItem | string | undefined) => {
		if (problemId instanceof vscode.TreeItem) {
			problemId = problemId.command?.arguments?.[0];
		}
		if (problemId === undefined) {
			problemId = await io.input('Please input the problem ID');
			if (problemId === undefined) {
				return;
			}
		}
		// TODO: Select language
		const lang = 'cc.cc14o2';
		const file = await vscode.window.showOpenDialog({
			title: 'Select the source code file',
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			openLabel: 'Submit',
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
				path: `/d/${cyezoiSettings.domain}/p/${problemId}/submit`,
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
					io.log('Connection opened');
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
					io.log('Connection closed, code: ' + code + ', reason: ' + reason);
					resolve(rid);
				});
			});

		});

		if (rid !== undefined) {
			vscode.commands.executeCommand('cyezoi.openSubmission', rid);
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openSubmission', async (rid: string | undefined) => {
		if (rid === undefined) {
			rid = await io.input('Please input the submission ID');
			if (rid === undefined) {
				return;
			}
		}
		new submissionWebview(rid, context.extensionPath);
	}));

	disposables.push(vscode.window.registerTreeDataProvider('cyezoi', new cyezoiTreeDataProvider()));

	outputChannel.appendLine('CYEZOI Helper is now active');
}

export function deactivate() { }
