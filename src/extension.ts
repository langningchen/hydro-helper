import * as vscode from 'vscode';
import auth from './auth';
import cyezFetch from './fetch';
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
	storage.extensionPath = context.extensionPath;

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
		if (isLoggedIn) { io.info(`Hi ${session.account.label}, you have successfully logged in!`); }
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.logout', async () => {
		io.warn('Please go to the Accounts tab (generally on the bottom left corner of the window) and log out from there.', {
			modal: true,
		});
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.downloadFile', async (url?: string, name?: string, fileSize?: number) => {
		url = url || await io.input('Please input the file URL');
		if (url === undefined) { return; }
		url = url.split('?')[0];
		name = name || url.split('/').pop()!;
		const file = await vscode.window.showSaveDialog({
			title: 'Select the download location',
			saveLabel: 'Download',
			defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath + '/' + name : name),
		});
		if (file === undefined) { return; }
		outputChannel.info(url, file.toString());
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Downloading file ${name}`,
			cancellable: true,
		}, async (progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => { abortController.abort(); });
			const responseData = await fetch(`http${settings.safeProtocol ? "s" : ""}://${settings.server}${url}`, {
				headers: { 'cookie': await auth.getCookiesValue(), },
				redirect: 'follow',
				signal: abortController.signal,
			});
			var receivedBytes = 0;
			const reader = responseData.body?.getReader();
			const chunks: Uint8Array[] = [];
			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) { break; }
					if (value) {
						chunks.push(value);
						receivedBytes += value.length;
						if (!fileSize) {
							progress.report({ message: `${receivedBytes} bytes received` });
						}
						else {
							progress.report({
								message: `${receivedBytes}/${fileSize} bytes received`,
								increment: value.length / fileSize * 100
							});
						}
					}
				}
			}
			progress.report({ message: 'Writing to file...', increment: undefined, });
			const buffer = new Uint8Array(receivedBytes);
			var offset = 0;
			for (const chunk of chunks) {
				buffer.set(chunk, offset);
				offset += chunk.length;
			}
			await vscode.workspace.fs.writeFile(file, buffer);
		});
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.submitProblem', async (pid?: vscode.TreeItem | string, tid?: string) => {
		if (pid instanceof vscode.TreeItem) {
			const args = pid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[pid, tid] = args;
			}
		}
		pid = pid || await io.input('Please input the problem ID', { value: vscode.window.activeTextEditor?.document.fileName.match(/\d+/)?.[0], });
		if (pid === undefined) { return; }

		const langs = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Getting language list...',
			cancellable: true,
		}, async (_progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => { abortController.abort(); });
			return await new cyezFetch({
				path: '/d/' + settings.domain + '/p/' + pid + '/submit' + (tid ? '?tid=' + tid : ''),
				addCookie: true, abortController
			}).start();
		}).then(response => response.json.langRange);

		const lastLanguage = await storage.lastLanguage;
		const lang = (await vscode.window.showQuickPick(Object.keys(langs).map(key => ({
			label: langs[key],
			description: key,
		})).sort((a, b) => {
			if (a.description === lastLanguage) { return -1; }
			if (b.description === lastLanguage) { return 1; }
			return 0;
		}), {
			title: 'Select the language',
		}))?.description;
		if (lang === undefined) { return; }
		storage.lastLanguage = lang;

		const file = await vscode.window.showOpenDialog({
			title: 'Select the source code file',
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			openLabel: 'Submit',
			defaultUri: vscode.window.activeTextEditor ? vscode.Uri.file(vscode.window.activeTextEditor.document.fileName) : undefined,
		});
		if (file === undefined) { return; }
		const code = await vscode.workspace.fs.readFile(file[0]);

		const response = await new cyezFetch({
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
		new rWeb(rid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.voteSolution', async (pid?: number, psid?: string, vote?: number) => {
		if (pid === undefined || psid === undefined || vote === undefined) {
			io.warn('Please use the context menu to vote for a solution.', { modal: true });
			return;
		}
		try {
			await new cyezFetch({
				path: `/d/${settings.domain}/p/${pid}/solution`,
				body: {
					operation: vote === 1 ? 'upvote' : 'downvote',
					psid,
				},
				addCookie: true,
			}).start();
		} catch (e) {
			io.error((e as Error).message);
			return;
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.attendC', async (tid?: vscode.TreeItem | string) => {
		if (tid instanceof vscode.TreeItem) {
			const args = tid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[tid] = args;
			}
		}
		tid = tid || await io.input('Please input the contest ID');
		if (tid === undefined) { return; }
		try {
			await new cyezFetch({
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
	disposables.push(vscode.commands.registerCommand('cyezoi.attendH', async (tid?: vscode.TreeItem | string) => {
		if (tid instanceof vscode.TreeItem) {
			const args = tid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[tid] = args;
			}
		}
		tid = tid || await io.input('Please input the homework ID');
		if (tid === undefined) { return; }
		try {
			await new cyezFetch({
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

	disposables.push(vscode.commands.registerCommand('cyezoi.openP', async (pid?: vscode.TreeItem | string, tid?: string) => {
		if (pid instanceof vscode.TreeItem) { pid = undefined; }
		pid = pid || await io.input('Please input the problem ID', { value: vscode.window.activeTextEditor?.document.fileName.match(/\d+/)?.[0], });
		if (pid === undefined) { return; }
		new pWeb(parseInt(pid), tid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openT', async (rid?: vscode.TreeItem | string) => {
		if (rid instanceof vscode.TreeItem) { rid = undefined; }
		rid = rid || await io.input('Please input the RID');
		if (rid === undefined) { return; }
		new rWeb(rid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openC', async (tid?: vscode.TreeItem | string) => {
		if (tid instanceof vscode.TreeItem) { tid = undefined; }
		tid = tid || await io.input('Please input the contest ID');
		if (tid === undefined) { return; }
		new cWeb(tid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openH', async (tid?: vscode.TreeItem | string) => {
		if (tid instanceof vscode.TreeItem) { tid = undefined; }
		tid = tid || await io.input('Please input the homework ID');
		if (tid === undefined) { return; }
		new cWeb(tid, true);
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
