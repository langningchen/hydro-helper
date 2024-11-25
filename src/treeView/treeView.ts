import * as vscode from 'vscode';
import { io, outputChannel } from '../io';

interface getChildrenParams {
    page: number
    setPageCounter: (pageCounter: number) => void
    element?: vscode.TreeItem
};

export default class <T extends vscode.TreeItem> implements vscode.TreeDataProvider<T> {
    protected _onDidChangeTreeData: vscode.EventEmitter<T | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<T | undefined> = this._onDidChangeTreeData.event;
    private page: number = 1;
    private pageCounter: number = -1;
    private type: string;
    private shortType: string;
    private _getChildren: (params: getChildrenParams) => Promise<T[]>;

    constructor(type: string, _getChildren: (params: getChildrenParams) => Promise<T[]>) {
        this.type = type;
        this.shortType = this.type.charAt(0);
        this._getChildren = _getChildren;

        vscode.commands.registerCommand(`cyezoi.refresh${this.shortType.toUpperCase()}Tree`, () => {
            outputChannel.trace(`[${this.shortType}Tree   ]`, `"cyezoi.refresh${this.shortType.toUpperCase()}Tree"`);
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand(`cyezoi.${this.shortType}TreeNxt`, () => {
            outputChannel.trace(`[${this.shortType}Tree   ]`, `"${this.shortType}TreeNxt"`);
            if (this.pageCounter === -1) { io.warn(`Please expand the ${this.type} tree first.`); return; }
            if (this.page < this.pageCounter) { this.page++; }
            else { io.warn('You are already on the last page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
        vscode.commands.registerCommand(`cyezoi.${this.shortType}TreePre`, () => {
            outputChannel.trace(`[${this.shortType}Tree   ]`, `"${this.shortType}TreePre"`);
            if (this.pageCounter === -1) { io.warn(`Please expand the ${this.type} tree first.`); return; }
            if (this.page > 1) { this.page--; }
            else { io.warn('You are already on the first page.'); }
            return this._onDidChangeTreeData.fire(undefined);
        });
    }

    getTreeItem(element: T): vscode.TreeItem {
        outputChannel.trace(`[${this.shortType}Tree   ]`, `"getTreeItem"`, arguments);
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<T[]> {
        outputChannel.trace(`[${this.shortType}Tree   ]`, `"getChildren"`, arguments);
        try {
            return this._getChildren({
                page: this.page,
                setPageCounter: (pageCounter: number) => { this.pageCounter = pageCounter; },
                element
            });
        } catch (e) {
            io.error((e as Error).message);
            return [];
        }
    }
}

