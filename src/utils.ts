import * as vscode from 'vscode';
import { marked } from "marked";
import settings from "./settings";
import auth from "./auth";
import { outputChannel } from './io';

export const statusName: { [key: number]: string } = {
    0: 'Waiting',
    1: 'Accepted',
    2: 'Wrong Answer',
    3: 'Time Exceeded',
    4: 'Memory Exceeded',
    5: 'Output Exceeded',
    6: 'Runtime Error',
    7: 'Compile Error',
    8: 'System Error',
    9: 'Cancelled',
    10: 'Unknown Error',
    11: 'Hacked',
    20: 'Running',
    21: 'Compiling',
    22: 'Fetched',
    30: 'Ignored',
    31: 'Format Error',
    32: 'Hack Successful',
    33: 'Hack Unsuccessful'
};
export const statusShortName: { [key: number]: string } = {
    1: 'AC',
    2: 'WA',
    3: 'TLE',
    4: 'MLE',
    5: 'OLE',
    6: 'RE',
    7: 'CE',
    8: 'SE',
    9: 'IGN',
    11: 'HK',
    30: 'IGN',
    31: 'FE'
};
export const statusIcon: { [key: number]: string } = {
    0: 'pending',
    1: 'pass',
    2: 'fail',
    3: 'fail',
    4: 'fail',
    5: 'fail',
    6: 'fail',
    7: 'fail',
    8: 'fail',
    9: 'ignored',
    10: 'fail',
    11: 'fail',
    20: 'progress',
    21: 'progress',
    22: 'progress',
    30: 'ignored',
    31: 'ignored',
    32: 'pass',
    33: 'fail'
};
export const statusEnded: { [key: number]: boolean } = {
    0: false,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
    10: true,
    11: true,
    20: false,
    21: false,
    22: false,
    30: true,
    31: true,
    32: true,
    33: true
};
export const languageDisplayName: { [key: string]: string } = {
    "bash": "Bash",
    "c": "C",
    "cc": "C++",
    "cc.cc98": "C++98",
    "cc.cc98o2": "C++98(O2)",
    "cc.cc11": "C++11",
    "cc.cc11o2": "C++11(O2)",
    "cc.cc14": "C++14",
    "cc.cc14o2": "C++14(O2)",
    "cc.cc17": "C++17",
    "cc.cc17o2": "C++17(O2)",
    "cc.cc20": "C++20",
    "cc.cc20o2": "C++20(O2)",
    "pas": "Pascal",
    "java": "Java",
    "kt": "Kotlin",
    "kt.jvm": "Kotlin/JVM",
    "py": "Python",
    "py.py2": "Python 2",
    "py.py3": "Python 3",
    "py.pypy3": "PyPy3",
    "php": "PHP",
    "rs": "Rust",
    "hs": "Haskell",
    "js": "NodeJS",
    "go": "Golang",
    "rb": "Ruby",
    "cs": "C#",
    "r": "R",
};
export const contestRuleName: { [key: string]: string } = {
    "acm": "ACM/ICPC",
    "oi": "OI",
    "ioi": "IOI",
    "strictioi": "IOI(Strict)",
    "ledo": "Ledo",
    "homework": "Assignment",
};

export interface ProblemDoc {
    _id: string
    owner: number
    domainId: string
    docType: number
    docId: number
    title: string
    tag: string[]
    hidden: boolean
    nSubmit: number
    nAccept: number
    difficulty: number
    stats: {
        AC: number
        WA: number
        TLE: number
        MLE: number
        RE: number
        SE: number
        IGN: number
        CE: number
        s100: number
    }
}
export interface ProblemStatusDoc {
    _id: string
    docId: number
    docType: number
    domainId: string
    uid: number
    rid: string
    score: number
    status: number
    counter: number
}
export interface RecordDoc {
    _id: string
    status: number
    uid: number
    code?: string
    lang: string
    pid: number
    domainId: string
    score: number
    time: number
    memory: number
    judgeTexts?: string[]
    compilerTexts?: string[]
    testCases?: {
        id: number
        subtaskId: number
        status: number
        score: number
        time: number
        memory: number
        message: string
    }[]
    judger: number
    judgeAt: string
    rejudged: boolean
    contest?: string
    files: any
    subtasks?: { [key: string]: { type: string, score: number, status: number } }
}
export interface UserDoc {
    uname: string
    mail: string
    perm: string
    role: string
    priv: number
    regat: string
    loginat: string
    tfa: boolean
    authn: boolean
}
export interface ContestDoc {
    _id: string
    content: string
    owner: number
    domainId: string
    docType: number
    docId: string
    penaltySince?: string,
    penaltyRules?: { [key: string]: number },
    duration?: number
    title: string
    rule: string
    beginAt: string
    endAt: string
    pids: number[]
    attend: number
    rated: boolean
    allowViewCode?: boolean
    assign: number[]
    autoHide?: boolean
    lockAt?: string
    maintainer: number[]
}
export interface ContestStatusDoc {
    _id: string
    docId: number
    docType: number
    domainId: string
    uid: number,
    attend: number,
    subscribe: number,
    counter: number,
    startAt: string,
    journal: {
        rid: string,
        pid: number,
        status: number,
        score: number,
        subtasks: { [key: string]: { type: string, score: number, status: number } }
    }[],
    rev: number,
    detail: { [key: string]: { rid: string, pid: number, status: number, score: number, subtasks: { [key: string]: { type: string, score: number, status: number } } } },
    display: { [key: string]: { rid: string, pid: number, status: number, score: number, subtasks: { [key: string]: { type: string, score: number, status: number } } } },
}
export interface ContestProblemDoc {
    _id: string
    owner: number
    domainId: string
    docType: number
    docId: number
    title: string
    config: {
        count: number
        memoryMin: number
        memoryMax: number
        timeMin: number
        timeMax: number
        type: string
    }
}
export interface ContestProblemStatusDoc {
    rid: string
    pid: number
    status: number
    score: number
    subtasks: { [key: string]: { type: string, score: number, status: number } }
}

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
export const formatString = (str: string | { message: string, params: string[] }) => {
    if (typeof str === 'string') {
        return str;
    }
    return str.message.replace(/{(\d+)}/g, (match, number) => {
        return str.params[number];
    });
};
export const findIndex = <K extends string | number>(
    statusMap: { [key in K]: string },
    target: string
): K | undefined => {
    for (const [key, value] of Object.entries(statusMap)) {
        if (value === target) {
            return key as K;
        }
    }
    return undefined;
};
export const parseMarkdown = async (extensionPath: string, webview: vscode.Webview, content: string, prefix?: string): Promise<{ fetchData: { [key: string]: string }, content: string }> => {
    const fetchData: { [key: string]: string } = {};
    content = content.replace(/\@\[(video|pdf)\]\((.+?)\)/g, (match, type, url) => {
        if (url.startsWith('file://')) {
            url = prefix + '/' + url.substring(7);
        }
        url = url.replace(/\?.*$/, '');
        const id = Math.random().toString(36).slice(2);
        fetchData[id] = url;
        if (type === 'video') {
            return `<video src="{{${id}}}" controls></video>`;
        }
        else if (type === 'pdf') {
            return `<div data-src="{{${id}}}" class="pdf"></div>`;
        }
        return '<a href="' + id + '">' + url + '</a>';
    });
    for (const [key, value] of Object.entries(fetchData)) {
        const responseData = await fetch(`https://${settings.server}${value}`, {
            headers: {
                'cookie': await auth.getCookiesValue(),
            },
            redirect: 'follow',
        });
        const filePath = vscode.Uri.file(`${extensionPath}/temp/${key}`);
        await vscode.workspace.fs.writeFile(filePath, new Uint8Array(await responseData.arrayBuffer()));
        const webviewUri = webview.asWebviewUri(filePath);
        outputChannel.info('Saved', `"https://${settings.server}${value}"`, 'to file', `"${filePath.toString()}"`, 'url', `"${webviewUri.toString()}"`);
        fetchData[key] = webviewUri.toString();
    }
    return {
        fetchData,
        content: await marked(content),
    };
};
