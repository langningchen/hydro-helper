import * as vscode from 'vscode';
import { outputChannel } from './outputChannel';

export class io {
    static info = <T extends string>(message: string, ...args: any): Thenable<T | undefined> => {
        outputChannel.appendLine(message);
        return vscode.window.showInformationMessage(message, ...args);
    };
    static warn = <T extends string>(message: string, ...args: any): Thenable<T | undefined> => {
        outputChannel.appendLine(message);
        return vscode.window.showWarningMessage(message, ...args);
    };
    static error = <T extends string>(message: string, ...args: any): Thenable<T | undefined> => {
        outputChannel.appendLine(message);
        return vscode.window.showErrorMessage(message, ...args);
    };
    static log = (message: string) => {
        outputChannel.appendLine(message);
    };
    static input = (placeHolder: string, options?: vscode.InputBoxOptions): Thenable<string | undefined> => {
        return vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder,
            ...options,
        });
    };
};
