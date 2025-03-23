import * as vscode from 'vscode';

export const outputChannel = vscode.window.createOutputChannel('Hydro Helper', {
    log: true,
});

export class io {
    static info = (message: string, options?: vscode.MessageOptions): undefined => {
        outputChannel.info(`Show information message`, '"' + message + '"', options);
        vscode.window.showInformationMessage(message, options);
    };
    static warn = (message: string, options?: vscode.MessageOptions): undefined => {
        outputChannel.warn(`Show warning message`, '"' + message + '"', options);
        vscode.window.showWarningMessage(message, options);
    };
    static error = (message: string, options?: vscode.MessageOptions): undefined => {
        outputChannel.error(`Show error message`, '"' + message + '"', options);
        vscode.window.showErrorMessage(message, options);
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
