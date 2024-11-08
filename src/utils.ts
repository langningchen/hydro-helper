import * as vscode from 'vscode';
import { outputChannel } from "./io";

export const getUnit = (data: number, unit: string) => {
    if (data >= 1 && data < 2) { return unit; }
    else { return unit + 's'; }
};
export const toTime = (time: number): string => {
    if (time < 1000) { return time + ' ms'; } time = Math.floor(time / 1000);
    if (time < 60) { return time + ' s'; } time = Math.floor(time / 60);
    if (time < 60) { return time + ' ' + getUnit(time, 'minute'); } time = Math.floor(time / 60);
    if (time < 24) { return time + ' ' + getUnit(time, 'hour'); } time = Math.floor(time / 24);
    if (time < 30) { return time + ' ' + getUnit(time, 'day'); } time = Math.floor(time / 30);
    if (time < 12) { return 'about ' + time + ' ' + getUnit(time, 'month'); } time = Math.floor(time / 12);
    return 'about ' + time + ' ' + getUnit(time, 'year');
};
export const toMemory = (time: number): string => {
    if (time < 1024) { return time + 'B'; } time = Math.floor(time / 1024);
    if (time < 1024) { return time + 'KiB'; } time = Math.floor(time / 1024);
    if (time < 1024) { return time + 'MiB'; } time = Math.floor(time / 1024);
    return time.toFixed(2) + 'GiB';
};
export const toRelativeTime = (time: number): string => {
    const now: number = new Date().getTime();
    const suffix = (time > now ? 'later' : 'ago');
    var delta = Math.floor(Math.abs(now - time) / 1000);
    if (delta < 60) { return 'just now'; } delta = Math.floor(delta / 60);
    if (delta < 60) { return delta + ' ' + getUnit(delta, 'minute') + ' ' + suffix; } delta = Math.floor(delta / 60);
    if (delta < 24) { return delta + ' ' + getUnit(delta, 'hour') + ' ' + suffix; } delta = Math.floor(delta / 24);
    if (delta < 30) { return delta + ' ' + getUnit(delta, 'day') + ' ' + suffix; } delta = Math.floor(delta / 30);
    if (delta < 12) { return 'about ' + delta + ' ' + getUnit(delta, 'month') + ' ' + suffix; } delta = Math.floor(delta / 12);
    return 'about ' + delta + ' ' + getUnit(delta, 'year') + ' ' + suffix;
};
export const getCookiesValue = async (): Promise<string> => {
    outputChannel.trace('[utils   ]', '"getCookiesValue"');
    return 'sid=' + (await vscode.authentication.getSession('cyezoi', ['cyezoi']).then((session: vscode.AuthenticationSession | undefined) => {
        if (!session) {
            return '';
        }
        return session.accessToken;
    }));
};
export const formatString = (str: string | { message: string, params: string[] }) => {
    if (typeof str === 'string') {
        return str;
    }
    return str.message.replace(/{(\d+)}/g, (match, number) => {
        return str.params[number];
    });
};
