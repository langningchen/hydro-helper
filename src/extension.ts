import * as vscode from 'vscode';
import auth from './auth';
import fetch from './fetch';
import { outputChannel, io } from './io';
import storage from './storage';
import settings from './settings';
import rWeb from './webview/rWeb';
import pWeb from './webview/pWeb';
import cWeb from './webview/cWeb';
import pTree from './treeView/pTree';
import rTree from './treeView/rTree';
import cTree from './treeView/cTree';

export const activate = async (context: vscode.ExtensionContext) => {
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
	disposables.push(vscode.commands.registerCommand('cyezoi.submitProblem', async (pid: vscode.TreeItem | string | undefined, tid?: string) => {
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
		}, async (_progress, token) => {
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

		new rWeb(context.extensionPath, rid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.attendC', async (tid: vscode.TreeItem | string | undefined) => {
		if (tid instanceof vscode.TreeItem) {
			const args = tid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[tid] = args;
			}
		}
		if (tid === undefined) {
			tid = await io.input('Please input the contest ID');
			if (tid === undefined) {
				return;
			}
		};
		try {
			await new fetch({
				path: `/d/${settings.domain}/contest/${tid}`, addCookie: true,
				body: {
					"operation": "attend",
				},
			}).start();
		} catch (e) {
			io.error((e as Error).message);
			return;
		}
		io.info('Contest attended');
		vscode.commands.executeCommand('cyezoi.refreshCTree');
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.attendH', async (tid: vscode.TreeItem | string | undefined) => {
		if (tid instanceof vscode.TreeItem) {
			const args = tid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[tid] = args;
			}
		}
		if (tid === undefined) {
			tid = await io.input('Please input the homework ID');
			if (tid === undefined) {
				return;
			}
		};
		try {
			await new fetch({
				path: `/d/${settings.domain}/homework/${tid}`, addCookie: true,
				body: {
					"operation": "attend",
				},
			}).start();
		} catch (e) {
			io.error((e as Error).message);
			return;
		}
		io.info('Homework attended');
		vscode.commands.executeCommand('cyezoi.refreshHTree');
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
		new pWeb(context.extensionPath, parseInt(pid), tid);
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
	disposables.push(vscode.commands.registerCommand('cyezoi.openH', async (tid: vscode.TreeItem | string | undefined) => {
		if (tid instanceof vscode.TreeItem) {
			tid = undefined;
		}
		if (tid === undefined) {
			tid = await io.input('Please input the homework ID');
			if (tid === undefined) {
				return;
			}
		}
		new cWeb(context.extensionPath, tid, true);
	}));

	disposables.push(vscode.window.registerTreeDataProvider('pTree', new pTree()));
	disposables.push(vscode.window.registerTreeDataProvider('rTree', new rTree()));
	disposables.push(vscode.window.registerTreeDataProvider('cTree', new cTree()));
	disposables.push(vscode.window.registerTreeDataProvider('hTree', new cTree(true)));

	auth.setLoggedIn(await auth.getLoginStatus());

	outputChannel.info('Extension activated');
};

export const deactivate = () => {
	outputChannel.info('Extension deactivated');
};
