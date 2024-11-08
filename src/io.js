"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.outputChannel = void 0;
var vscode = require("vscode");
exports.outputChannel = vscode.window.createOutputChannel('CYEZOI', {
    log: true,
});
var io = /** @class */ (function () {
    function io() {
    }
    io.info = function (message) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        exports.outputChannel.info.apply(exports.outputChannel, __spreadArray(["Show information message", '"' + message + '"'], args, false));
        return (_a = vscode.window).showInformationMessage.apply(_a, __spreadArray([message], args, false));
    };
    io.warn = function (message) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        exports.outputChannel.warn.apply(exports.outputChannel, __spreadArray(["Show warning message", '"' + message + '"'], args, false));
        return (_a = vscode.window).showWarningMessage.apply(_a, __spreadArray([message], args, false));
    };
    io.error = function (message) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        exports.outputChannel.error.apply(exports.outputChannel, __spreadArray(["Show error message", '"' + message + '"'], args, false));
        return (_a = vscode.window).showErrorMessage.apply(_a, __spreadArray([message], args, false));
    };
    io.input = function (placeHolder, options) {
        exports.outputChannel.trace('[io      ]', '"input"', placeHolder, options);
        return vscode.window.showInputBox(__assign({ ignoreFocusOut: true, placeHolder: placeHolder }, options));
    };
    return io;
}());
exports.io = io;
;
