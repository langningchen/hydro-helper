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
import attr from './attr';

interface Problem {
	name: string
	url: string
	interactive: boolean
	memoryLimit: string
	timeLimit: string
	group: string
	tests: {
		input: string
		output: string
		id: number
	}[]
	srcPath: string
	local: boolean
}

const ensureData = async (data: string | undefined, name: string, displayName?: string, defaultValue?: string): Promise<string | undefined> => {
	if (!data && vscode.window.activeTextEditor) {
		const attribute = new attr(vscode.window.activeTextEditor.document.uri);
		await attribute.load();
		data = attribute.attributes.get(name);
	}
	if (!data && displayName) {
		data = await io.input(`Please input the ${displayName}`, defaultValue ? { value: defaultValue, } : {});
	}
	return data;
};

export const activate = async (context: vscode.ExtensionContext) => {
	storage.secretStorage = context.secrets;
	storage.extensionPath = context.extensionPath;

	await vscode.workspace.fs.delete(vscode.Uri.file((await storage.extensionPath) + '/temp'), { recursive: true });
	await vscode.workspace.fs.createDirectory(vscode.Uri.file((await storage.extensionPath) + '/temp'));

	const disposables: vscode.Disposable[] = [];
	context.subscriptions.push(new vscode.Disposable(() => vscode.Disposable.from(...disposables).dispose()));

	disposables.push(outputChannel);
	disposables.push(vscode.authentication.registerAuthenticationProvider('cyezoi', 'CYEZOI', new auth(), {
		supportsMultipleAccounts: false,
	}));

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1e10);
	statusBarItem.command = 'cyezoi.changeD';
	statusBarItem.text = `$(tools) CYEZOI: ${settings.domain}`;
	statusBarItem.tooltip = 'Click to change the domain';
	statusBarItem.show();
	disposables.push(statusBarItem);
	vscode.workspace.onDidChangeConfiguration(() => {
		statusBarItem.text = `$(tools) CYEZOI: ${settings.domain}`;
		vscode.commands.executeCommand('cyezoi.refreshPTree');
		vscode.commands.executeCommand('cyezoi.refreshRTree');
		vscode.commands.executeCommand('cyezoi.refreshCTree');
	});

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
	disposables.push(vscode.commands.registerCommand('cyezoi.changeD', async () => {
		const domains = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Fetching domain list...`,
			cancellable: true,
		}, async (_progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => { abortController.abort(); });
			const response = await new cyezFetch({
				path: '/home/domain',
				abortController,
			}).start();
			return response.json.ddocs;
		});
		const domain = (await vscode.window.showQuickPick(domains.map((domain: any) => ({
			label: domain.name,
			description: domain._id,
		})) as vscode.QuickPickItem[], {
			title: 'Select the domain',
		}))?.description;
		outputChannel.info(domain || 'No domain selected');
		if (!domain) { return; }
		await settings.setDomain(domain);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.downloadFile', async (url?: string, name?: string, fileSize?: number) => {
		url = url || await io.input('Please input the file URL');
		if (!url) { return; }
		name = name || url.split('/').pop()!;
		const file = await vscode.window.showSaveDialog({
			title: 'Select the download location',
			saveLabel: 'Download',
			defaultUri: vscode.Uri.file(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath + '/' + name : name),
		});
		if (!file) { return; }
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
	disposables.push(vscode.commands.registerCommand('cyezoi.submitP', async (pid?: vscode.TreeItem | string, tid?: string) => {
		if (pid instanceof vscode.TreeItem) {
			const args = pid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[pid, tid] = args;
			}
		}
		pid = await ensureData(pid as (string | undefined), 'pid', 'problem ID', vscode.window.activeTextEditor?.document.fileName.match(/\d+/)?.[0]);
		if (!pid) { return; }
		tid = await ensureData(tid, 'tid');

		const langs = await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Getting language list...',
			cancellable: true,
		}, async (_progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => { abortController.abort(); });
			return await new cyezFetch({
				path: `/d/${settings.domain}/p/${pid}/submit` + (tid ? '?tid=' + tid : ''),
				abortController
			}).start();
		}).then(response => response.json.langRange);

		var lang = await ensureData(undefined, 'lang');
		if (!lang) {
			const lastLanguage = await storage.lastLanguage;
			lang = (await vscode.window.showQuickPick(Object.keys(langs).map(key => ({
				label: langs[key],
				description: key,
			})).sort((a, b) => {
				if (a.description === lastLanguage) { return -1; }
				if (b.description === lastLanguage) { return 1; }
				return 0;
			}), {
				title: 'Select the language',
			}))?.description;
		}
		if (!lang) { return; }
		storage.lastLanguage = lang;

		const file = await vscode.window.showOpenDialog({
			title: 'Select the source code file',
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			openLabel: 'Submit',
			defaultUri: vscode.window.activeTextEditor ? vscode.Uri.file(vscode.window.activeTextEditor.document.fileName) : undefined,
		});
		if (!file) { return; }

		const attribute = new attr(file[0]);
		await attribute.load();
		attribute.attributes.set('pid', pid);
		if (tid) { attribute.attributes.set('tid', tid); }
		else { attribute.attributes.delete('tid'); }
		attribute.attributes.set('lang', lang);
		await attribute.save();

		const response = await new cyezFetch({
			path: `/d/${settings.domain}/p/${pid}/submit` + (tid ? '?tid=' + tid : ''),
			body: {
				lang,
				code: (await vscode.workspace.fs.readFile(file[0])).toString(),
			},
		}).start();
		const rid = response.json.rid;
		if (!rid) {
			io.error('Submit failed');
			return;
		}

		await new rWeb(rid).dispose;
		vscode.commands.executeCommand('cyezoi.refreshPTree');
		vscode.commands.executeCommand('cyezoi.refreshRTree');
		if (tid) {
			vscode.commands.executeCommand('cyezoi.refreshCTree');
			vscode.commands.executeCommand('cyezoi.refreshHTree');
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.starP', async (pid?: vscode.TreeItem | string) => {
		if (pid instanceof vscode.TreeItem) {
			const args = pid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[pid] = args;
			}
		}
		pid = await ensureData(pid?.toString(), 'pid', 'problem ID', vscode.window.activeTextEditor?.document.fileName.match(/\d+/)?.[0]);
		if (!pid) { return; }
		try {
			const lastState = await new cyezFetch({ path: `/d/problemset/p/${pid}` }).start().then(response => response.json.psdoc?.star);
			await new cyezFetch({
				path: `/d/problemset/p/${pid}`,
				body: {
					operation: 'star',
					star: lastState === undefined ? true : !lastState,
				},
			}).start();
			vscode.commands.executeCommand('cyezoi.refreshPTree');
		} catch (e) {
			io.error((e as Error).message);
			return;
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.voteSolution', async (pid?: number, psid?: string, vote?: number) => {
		if (!pid || !psid || !vote) {
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
			}).start();
		} catch (e) {
			io.error((e as Error).message);
			return;
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.sendToCPH', async (problemString?: string) => {
		if (!problemString) {
			io.error('Please use the problem view to send the problem to the CPH.', { modal: true });
		}
		const problem = JSON.parse(problemString!) as Problem;
		problem.url = `http${settings.safeProtocol ? "s" : ""}://${settings.server}/d/${settings.domain}/p/${problem.url}`;
		fetch(`http://localhost:27121`, {
			method: 'POST',
			body: JSON.stringify(problem),
		}).catch(e => {
			io.error((e as Error).message);
		});
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.attendC', async (tid?: vscode.TreeItem | string) => {
		if (tid instanceof vscode.TreeItem) {
			const args = tid.command?.arguments;
			if (args && args[Symbol.iterator]) {
				[tid] = args;
			}
		}
		tid = await ensureData(tid as (string | undefined), 'tid', 'contest ID');
		if (!tid) { return; }
		try {
			await new cyezFetch({
				path: `/d/${settings.domain}/contest/${tid}`,
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
		tid = await ensureData(tid as (string | undefined), 'tid', 'homework ID');
		if (!tid) { return; }
		try {
			await new cyezFetch({
				path: `/d/${settings.domain}/homework/${tid}`,
				body: {
					"operation": "attend",
				},
			}).start();
		} catch (e) {
			io.error((e as Error).message);
			return;
		}
		io.info('Homework claimed');
		vscode.commands.executeCommand('cyezoi.refreshHTree');
	}));

	disposables.push(vscode.commands.registerCommand('cyezoi.openP', async (pid?: vscode.TreeItem | string, tid?: string) => {
		if (pid instanceof vscode.TreeItem) { pid = undefined; }
		const activeTextEditor = vscode.window.activeTextEditor;
		pid = await ensureData(pid, 'pid', 'problem ID', activeTextEditor?.document.fileName.match(/\d+/)?.[0]);
		if (!pid) { return; }
		tid = await ensureData(tid, 'tid');
		new pWeb(parseInt(pid), tid);
		if (activeTextEditor) {
			const attribute = new attr(activeTextEditor.document.uri);
			await attribute.load();
			attribute.attributes.set('pid', pid);
			if (tid) { attribute.attributes.set('tid', tid); }
			else { attribute.attributes.delete('tid'); }
			await attribute.save();
		}
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openT', async (rid?: vscode.TreeItem | string) => {
		if (rid instanceof vscode.TreeItem) { rid = undefined; }
		rid = await ensureData(rid, 'rid', 'RID');
		if (!rid) { return; }
		new rWeb(rid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openC', async (tid?: vscode.TreeItem | string) => {
		if (tid instanceof vscode.TreeItem) { tid = undefined; }
		tid = await ensureData(tid, 'tid', 'contest ID');
		if (!tid) { return; }
		new cWeb(tid);
	}));
	disposables.push(vscode.commands.registerCommand('cyezoi.openH', async (tid?: vscode.TreeItem | string) => {
		if (tid instanceof vscode.TreeItem) { tid = undefined; }
		tid = await ensureData(tid, 'tid', 'homework ID');
		if (!tid) { return; }
		new cWeb(tid, true);
	}));

	disposables.push(vscode.window.registerTreeDataProvider('pTree', new pTree()));
	disposables.push(vscode.window.registerTreeDataProvider('rTree', new rTree()));
	disposables.push(vscode.window.registerTreeDataProvider('cTree', new cTree()));
	disposables.push(vscode.window.registerTreeDataProvider('hTree', new cTree(true)));

	auth.setLoggedIn(await auth.getLoginStatus());

	outputChannel.info('Extension activated');
};

export const deactivate = async () => {
	outputChannel.info('Extension deactivated');
};
