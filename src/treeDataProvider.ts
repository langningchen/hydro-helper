import * as vscode from 'vscode';
import { cyezoiProblemTreeDataProvider, Problem } from "./problemTreeDataProvider";

export class cyezoiTreeDataProvider implements vscode.TreeDataProvider<any> {
    private _problemTreeDataProvider: cyezoiProblemTreeDataProvider;

    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        this._problemTreeDataProvider = new cyezoiProblemTreeDataProvider(this._onDidChangeTreeData);
    }

    getTreeItem(element: any): vscode.TreeItem {
        if (element instanceof Problem) {
            return this._problemTreeDataProvider.getTreeItem(element);
        }
        return element;
    }

    async getChildren(element?: any): Promise<any[]> {
        if (!element) {
            return [new ProblemContainer()];
        }
        if (element instanceof ProblemContainer) {
            return this._problemTreeDataProvider.getChildren();
        }
        return [];
    }
}

export class ProblemContainer extends vscode.TreeItem {
    constructor() {
        super('Problems', vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'problemContainer';
    }
}
