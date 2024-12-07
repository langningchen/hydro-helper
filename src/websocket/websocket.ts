import { WebSocket } from "ws";
import settings from "../settings";
import auth from "../auth";
import { io } from '../io';

export default class {
    private interval: NodeJS.Timeout | undefined;
    private path: string;
    private callback: (responseJSON: any) => void;
    constructor(path: string, callback: (responseJSON: any) => void) {
        this.path = path;
        this.callback = callback;
    }
    start = async () => {
        const ws = new WebSocket(`ws${settings.safeProtocol ? "s" : ""}://${settings.server}/${this.path}`, {
            headers: { 'cookie': await auth.getCookiesValue(), },
        });

        ws.on('open', () => {
            this.interval = setInterval(() => {
                ws.send('ping');
            }, 3e4);
        });

        ws.on('message', (data) => {
            const stringData = data.toString();
            if (stringData === 'ping') {
                ws.send('pong');
                return;
            }
            if (stringData === 'pong') { return; }
            const responseJSON = JSON.parse(stringData);
            if (responseJSON.error !== undefined) { ws.close(); }
            this.callback(responseJSON);
        });

        ws.on('error', (err) => { io.error(err.toString()); });
        ws.on('close', (_code, _reason) => { clearInterval(this.interval); });
    };
};
