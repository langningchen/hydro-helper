import * as vscode from 'vscode';
import { cyezoiProblemTreeDataProvider, Problem } from "./problemTreeDataProvider";

export class cyezoiTreeDataProvider implements vscode.TreeDataProvider<any> {
    private _problemTreeDataProvider: cyezoiProblemTreeDataProvider;

    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        this._problemTreeDataProvider = new cyezoiProblemTreeDataProvider();
    }

    getTreeItem(element: any): vscode.TreeItem {
        return this._problemTreeDataProvider.getTreeItem(element);
    }

    async getChildren(element?: any): Promise<Problem[]> {
        return this._problemTreeDataProvider.getChildren(element);
    }
}
