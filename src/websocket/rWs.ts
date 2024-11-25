import * as utils from '../utils';
import { Record } from "../treeView/rTree";
import websocket from "./websocket";
import { parseFromString } from 'dom-parser';
import settings from '../settings';

export default class extends websocket {
    constructor(callback: (record: Record) => void) {
        super(`record-conn?domainId=${settings.domain}`, (responseJSON: any) => {
            const dom = parseFromString(responseJSON.html);
            const tr = dom.getElementsByTagName('tr')[0];
            const rdoc: utils.RecordDoc = {
                _id: tr.getAttribute('data-rid'),
                status: utils.findIndex<number>(utils.statusName, tr.getElementsByClassName('record-status--text')[0].textContent.split('\n')[2].trim())!,
                uid: parseInt(tr.getElementsByClassName('user-profile-name')[0].getAttribute('href').split('/').pop()!),
                lang: utils.findIndex<string>(utils.languageDisplayName, tr.getElementsByClassName('col--lang')[0].textContent.trim())!,
                pid: parseInt(tr.getElementsByClassName('col--problem')[0].textContent.split('\n')[1].trim()),
                domainId: tr.getElementsByClassName('record-status--text')[0].getAttribute('href')!.split('/')[2],
                score: parseInt(tr.getElementsByClassName('record-status--text')[0].getElementsByTagName('span')[0].textContent),
                time: parseInt(tr.getElementsByClassName('col--time')[0].textContent.split('ms')[0]) || 0,
                memory: parseFloat(tr.getElementsByClassName('col--memory')[0].textContent.split('MiB')[0]) * 1024 || 0,
                judger: -1,
                judgeAt: tr.getElementsByClassName('time')[0].textContent,
                rejudged: false,
                files: [],
            };
            const progress = tr.getElementsByClassName('col--status__progress')[0]?.getAttribute('style')?.split(':')[1].trim();
            const record = new Record(rdoc,
                tr.getElementsByClassName('col--problem')[0].textContent.split('\n')[2].replaceAll('&nbsp;', '').trim() +
                (progress ? ` (${progress})` : ''),
                tr.getElementsByClassName('user-profile-name')[0].textContent.trim());
            callback(record);
        });
    }
}
