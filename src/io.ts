import * as vscode from 'vscode';

export const outputChannel = vscode.window.createOutputChannel('CYEZOI', {
    log: true,
});

export class io {
    static info = <T extends string>(message: string, ...args: any): Thenable<T | undefined> => {
        outputChannel.info(`Show information message`, '"' + message + '"', ...args);
        return vscode.window.showInformationMessage(message, ...args);
    };
    static warn = <T extends string>(message: string, ...args: any): Thenable<T | undefined> => {
        outputChannel.warn(`Show warning message`, '"' + message + '"', ...args);
        return vscode.window.showWarningMessage(message, ...args);
    };
    static error = <T extends string>(message: string, ...args: any): Thenable<T | undefined> => {
        outputChannel.error(`Show error message`, '"' + message + '"', ...args);
        return vscode.window.showErrorMessage(message, ...args);
    };
    static input = (placeHolder: string, options?: vscode.InputBoxOptions): Thenable<string | undefined> => {
        outputChannel.trace('[io      ]', '"input"', placeHolder, options);
        return vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder,
            ...options,
        });
    };
};
