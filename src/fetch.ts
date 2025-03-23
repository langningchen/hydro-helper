import { outputChannel } from './io';
import settings from './settings';
import auth from './auth';

interface HydroError extends Error {
    params: string[]
    code: number
}

interface fetchOptions {
    path: string
    body?: string | object
    addCookie?: boolean
    abortController?: AbortController
    returnError?: boolean
    ignoreLogin?: boolean
}

interface fetchReturn {
    status: number
    json?
    cookies?: string[]
    error?: Error
}

export default class {
    response: Response | undefined;
    options: fetchOptions;
    returnValue: fetchReturn = { status: 0 };

    constructor(options: fetchOptions) {
        outputChannel.debug(`Fetching ${options.path}`, options);
        this.options = options;
    }

    doFetch = async (): Promise<void> => {
        outputChannel.trace('[fetch   ]', '"doFetch"');
        this.response = await fetch(`http${settings.safeProtocol ? "s" : ""}://${settings.server}${this.options.path}`, {
            method: this.options.body ? 'POST' : 'GET',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                cookie: this.options.addCookie ?? true ? await auth.getCookiesValue() : '',
                'user-agent': 'VSCode-HydroHelper',
            },
            body: this.options.body ? JSON.stringify(this.options.body) : undefined,
            signal: this.options.abortController?.signal,
        });
    };

    parseResponse = async (): Promise<void> => {
        outputChannel.trace('[fetch   ]', '"parseResponse"');
        this.returnValue.status = this.response!.status;
        this.returnValue.cookies = this.response!.headers.getSetCookie();
        this.returnValue.json = await this.response!.json();
        outputChannel.info('Fetched', this.options.path, 'status', this.returnValue.status);
        outputChannel.debug('Response', this.returnValue);
    };

    checkError = async (): Promise<void> => {
        outputChannel.trace('[fetch   ]', '"checkError"');
        if (this.returnValue.json?.error) {
            const errorData = <HydroError>this.returnValue.json.error;
            const message = errorData.message.replace(/{(\d+)}/g, (_, number) => errorData.params[number]);
            if (this.options.returnError) {
                this.returnValue.error = new Error(message);
                return;
            }
            throw new Error(message);
        }
    };

    checkLogin = async (): Promise<void> => {
        outputChannel.trace('[fetch   ]', '"checkLogin"');
        if (!this.options.ignoreLogin) {
            if (this.returnValue.json.url?.includes('/login')) {
                auth.setLoggedIn(false);
                throw new Error('Not logged in');
            }
        }
    };

    start = async (): Promise<fetchReturn> => {
        outputChannel.trace('[fetch   ]', '"start"');
        await this.doFetch();
        await this.parseResponse();
        await this.checkError();
        await this.checkLogin();
        return this.returnValue;
    };
};
