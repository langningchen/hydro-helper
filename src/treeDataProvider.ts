import * as vscode from 'vscode';
import { cyezoiProblemTreeDataProvider, Problem } from "./problemTreeDataProvider";
import { cyezoiRecordTreeDataProvider, Record } from './recordTreeDataProvider';

export class cyezoiTreeDataProvider implements vscode.TreeDataProvider<any> {
    private _problemTreeDataProvider: cyezoiProblemTreeDataProvider;
    private _recordTreeDataProvider: cyezoiRecordTreeDataProvider;

    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined> = new vscode.EventEmitter<any | undefined>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        this._problemTreeDataProvider = new cyezoiProblemTreeDataProvider(this._onDidChangeTreeData);
        this._recordTreeDataProvider = new cyezoiRecordTreeDataProvider(this._onDidChangeTreeData);
    }

    getTreeItem(element: any): vscode.TreeItem {
        if (element instanceof Problem) {
            return this._problemTreeDataProvider.getTreeItem(element);
        }
        if (element instanceof Record) {
            return this._recordTreeDataProvider.getTreeItem(element);
        }
        return element;
    }

    async getChildren(element?: any): Promise<any[]> {
        if (!element) {
            return [new ProblemContainer(), new RecordContainer()];
        }
        if (element instanceof ProblemContainer) {
            return this._problemTreeDataProvider.getChildren();
        }
        if (element instanceof RecordContainer) {
            return this._recordTreeDataProvider.getChildren();
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

export class RecordContainer extends vscode.TreeItem {
    constructor() {
        super('Submissions', vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'submissionContainer';
    }
}
