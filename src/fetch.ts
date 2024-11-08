import { outputChannel } from './io';
import settings from './settings';
import { getCookiesValue } from './utils';
import auth from './auth';

interface HydroError extends Error {
    params: any[]
    code: number
}

interface fetchOptions {
    path: string
    body?: any
    addCookie?: boolean
    abortController?: AbortController
    returnError?: boolean
    ignoreLogin?: boolean
}

interface fetchReturn {
    status: number
    json?: any
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

    doFetch = async (options: fetchOptions): Promise<void> => {
        outputChannel.trace('[fetch   ]', '"doFetch"');
        this.response = await fetch(`https://${settings.server}${options.path}`, {
            method: options.body ? 'POST' : 'GET',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'cookie': options.addCookie ? await getCookiesValue() : '',
                'user-agent': 'VSCode-CYEZOIHelper',
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: options.abortController?.signal,
        });
    };

    parseResponse = async (): Promise<void> => {
        outputChannel.trace('[fetch   ]', '"parseResponse"');
        this.returnValue.status = this.response!.status;
        this.returnValue.cookies = this.response!.headers.getSetCookie();
        this.returnValue.json = await this.response!.json();
        if (typeof this.returnValue.json.UserContext === 'string') {
            this.returnValue.json.UserContext = JSON.parse(this.returnValue.json.UserContext);
        }
        outputChannel.info('Fetched', this.options.path, 'status', this.returnValue.status);
        outputChannel.debug('Response', this.returnValue);
    };

    checkError = async (): Promise<void> => {
        outputChannel.trace('[fetch   ]', '"checkError"');
        if (this.returnValue.json.error) {
            const errorData = <HydroError>this.returnValue.json.error;
            const message = errorData.message.replace(/{(\d+)}/g, (match, number) => {
                return errorData.params[number];
            });
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
            if (!this.returnValue.json.UserContext) {
                auth.setLoginStatus(false);
                throw new Error('No UserContext in response');
            }
            if (this.returnValue.json.UserContext._id === 0) {
                auth.setLoginStatus(false);
                throw new Error('Not logged in');
            }
        }
    };

    start = async (): Promise<fetchReturn> => {
        outputChannel.trace('[fetch   ]', '"start"');
        await this.doFetch(this.options);
        await this.parseResponse();
        await this.checkError();
        await this.checkLogin();
        return this.returnValue;
    };
};
