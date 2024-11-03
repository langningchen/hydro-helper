import * as vscode from 'vscode';
import { outputChannel } from "./io";

export const getUnit = (data: number, unit: string) => {
    if (data >= 1 && data < 2) { return data + ' ' + unit; }
    else { return data + ' ' + unit + 's'; }
};
export const toTime = (time: number): string => {
    if (time < 1000) { return time + 'ms'; } time /= 1000;
    if (time < 60) { return time.toFixed(2) + 's'; } time /= 60;
    if (time < 60) { return time.toFixed(2) + getUnit(time, 'minute'); } time /= 60;
    if (time < 24) { return time.toFixed(2) + getUnit(time, 'hour'); } time /= 24;
    if (time < 30) { return time.toFixed(2) + getUnit(time, 'day'); } time /= 30;
    if (time < 12) { return 'about ' + Math.floor(time) + getUnit(time, 'month'); } time /= 12;
    return 'about ' + Math.floor(time) + getUnit(time, 'year');
};
export const toMemory = (time: number): string => {
    if (time < 1024) { return time + 'B'; } time /= 1024;
    if (time < 1024) { return time.toFixed(2) + 'KiB'; } time /= 1024;
    if (time < 1024) { return time.toFixed(2) + 'MiB'; } time /= 1024;
    return time.toFixed(2) + 'GiB';
};
export const toRelativeTime = (time: number): string => {
    const now: number = new Date().getTime();
    const suffix = (time > now ? 'later' : 'ago');
    var delta = Math.floor(Math.abs(now - time) / 1000);
    if (delta < 60) { return 'just now'; } delta = Math.floor(delta / 60);
    if (delta < 60) { return delta + getUnit(delta, 'minute') + ' ' + suffix; } delta = Math.floor(delta / 60);
    if (delta < 24) { return delta + getUnit(delta, 'hour') + ' ' + suffix; } delta = Math.floor(delta / 24);
    if (delta < 30) { return delta + getUnit(delta, 'day') + ' ' + suffix; } delta = Math.floor(delta / 30);
    if (delta < 12) { return 'about ' + delta + getUnit(delta, 'month') + ' ' + suffix; } delta = Math.floor(delta / 12);
    return 'about ' + delta + getUnit(delta, 'year') + ' ' + suffix;
};
export const getCookiesValue = async (): Promise<string> => {
    outputChannel.trace('[utils]', '"getCookiesValue"');
    return 'sid=' + (await vscode.authentication.getSession('cyezoi', ['cyezoi'], { createIfNone: false }).then((session: vscode.AuthenticationSession | undefined) => {
        if (!session) {
            return '';
        }
        return session.accessToken;
    }));
};
