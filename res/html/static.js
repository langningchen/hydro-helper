const statusName = {
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
const statusShortName = {
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
const statusIcon = {
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
const statusEnded = {
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
const languageDisplayName = {
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
const contestRuleName = {
    "acm": "ACM/ICPC",
    "oi": "OI",
    "ioi": "IOI",
    "strictioi": "IOI(Strict)",
    "ledo": "Ledo",
    "homework": "Assignment",
};
const scoreColor = [
    '#ff4f4f',
    '#ff694f',
    '#f8603a',
    '#fc8354',
    '#fa9231',
    '#f7bb3b',
    '#ecdb44',
    '#e2ec52',
    '#b0d628',
    '#93b127',
    '#25ad40',
];

const findIndex = (statusMap, target) => {
    for (const [key, value] of Object.entries(statusMap)) {
        if (value === target) {
            return key;
        }
    }
    return undefined;
};
const getUnit = (data, unit) => {
    if (data >= 1 && data < 2) { return unit; }
    else { return unit + 's'; }
};
const toTime = (time) => {
    if (time < 1000) { return time + 'ms'; } time = Math.floor(time / 1000);
    if (time < 60) { return time + 's'; } time = Math.floor(time / 60);
    if (time < 60) { return time + ' ' + getUnit(time, 'minute'); } time = Math.floor(time / 60);
    if (time < 24) { return time + ' ' + getUnit(time, 'hour'); } time = Math.floor(time / 24);
    if (time < 30) { return time + ' ' + getUnit(time, 'day'); } time = Math.floor(time / 30);
    if (time < 12) { return 'about ' + Math.floor(time) + ' ' + getUnit(time, 'month'); } time = Math.floor(time / 12);
    return 'about ' + Math.floor(time) + ' ' + getUnit(time, 'year');
};
const parseTime = (time) => {
    if (time.endsWith('ms')) { return parseInt(time.slice(0, -2)); }
    else if (time.startsWith('≥')) { return parseInt(time.slice(1)); }
    else {
        return -1;
    }
};
const toMemory = (time) => {
    if (time < 1024) { return time + 'B'; } time = Math.floor(time / 1024);
    if (time < 1024) { return time + 'KiB'; } time = Math.floor(time / 1024);
    if (time < 1024) { return time + 'MiB'; } time = Math.floor(time / 1024);
    return time + 'GiB';
};
const parseMemory = (memory) => {
    if (memory.endsWith('KiB')) { return parseInt(memory.slice(0, -3)); }
    else if (memory.endsWith('MiB')) { return parseInt(memory.slice(0, -3)) * 1024; }
    else {
        return -1;
    }
};
const toRelativeTime = (time) => {
    const now = new Date().getTime();
    const suffix = (time > now ? 'later' : 'ago');
    var delta = Math.floor(Math.abs(now - time) / 1000);
    if (delta < 60) { return 'just now'; } delta = Math.floor(delta / 60);
    if (delta < 60) { return delta + ' ' + getUnit(delta, 'minute') + ' ' + suffix; } delta = Math.floor(delta / 60);
    if (delta < 24) { return delta + ' ' + getUnit(delta, 'hour') + ' ' + suffix; } delta = Math.floor(delta / 24);
    if (delta < 30) { return delta + ' ' + getUnit(delta, 'day') + ' ' + suffix; } delta = Math.floor(delta / 30);
    if (delta < 12) { return 'about ' + delta + ' ' + getUnit(delta, 'month') + ' ' + suffix; } delta = Math.floor(delta / 12);
    return 'about ' + delta + ' ' + getUnit(delta, 'year') + ' ' + suffix;
};
const formatString = (str) => {
    if (typeof str === 'string') {
        return str;
    }
    var message = str.message;
    for (const param of str.params) {
        message = message.replace(`{${param.key}}`, param.value);
    }
    return message;
};
const parseMarkdown = ({ content, fetchData }) => {
    return content.replace(/\{\{([a-z0-9]+)\}\}/g, (match, id) => {
        return fetchData[id];
    });
};
const renderPdf = async () => {
    for (const pdfElement of document.getElementsByClassName('pdf')) {
        const sourceUrl = pdfElement.getAttribute('data-src');
        if (!sourceUrl) {
            continue;
        }
        pdfElement.style.width = '100%';
        const pdf = await pdfjsLib.getDocument(sourceUrl).promise;

        for (var page = 1; page <= pdf.numPages; page++) {
            const canvas = document.createElement('canvas');
            pdfElement.appendChild(canvas);

            const pageData = await pdf.getPage(page);
            const viewport = pageData.getViewport({
                scale: document.body.clientWidth / pageData.getViewport({ scale: 1.0 }).width,
            });

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            canvas.style.width = Math.floor(viewport.width) + "px";
            canvas.style.height = Math.floor(viewport.height) + "px";

            pageData.render({
                canvasContext: canvas.getContext('2d'),
                viewport,
            });
        }

        pdfElement.removeAttribute('data-src');
    }
};
const renderCode = () => {
    const editors = [];
    for (const pre of document.getElementsByTagName('pre')) {
        if (pre.className.indexOf('CodeMirror') !== -1) {
            continue;
        }
        const code = pre.innerText.trim();
        const codeElement = document.createElement('div');
        const copyButtonContainer = document.createElement('div');
        copyButtonContainer.style.position = 'absolute';
        copyButtonContainer.style.width = 'calc(100% - 40px)';
        copyButtonContainer.style.display = 'flex';
        copyButtonContainer.style.flexDirection = 'row-reverse';
        copyButtonContainer.style.zIndex = '3';
        copyButtonContainer.style.pointerEvents = 'none';
        const copyButton = document.createElement('vscode-button');
        copyButton.innerText = 'Copy';
        copyButton.style.pointerEvents = 'auto';
        copyButton.onclick = () => {
            navigator.clipboard.writeText(code);
            copyButton.innerText = 'Copied';
            copyButton.disabled = true;
            setTimeout(() => {
                copyButton.innerText = 'Copy';
                copyButton.disabled = false;
            }, 1000);
        };
        copyButtonContainer.appendChild(copyButton);
        codeElement.appendChild(copyButtonContainer);
        const editorElement = document.createElement('div');
        codeElement.appendChild(editorElement);
        editors.push(window.CodeMirror(editorElement, {
            autoRefresh: true,
            value: code,
            readOnly: true,
            theme: 'material',
            lineNumbers: true,
            mode: 'text/x-c++src',
            gutters: [
                'CodeMirror-linenumbers',
                'CodeMirror-foldgutter',
            ],
            foldGutter: true,
            styleActiveLine: true,
        }));
        pre.parentNode.replaceChild(codeElement, pre);
    }
    for (const editor of editors) {
        editor.setSize('100%', 'auto');
    }
};
const sanitizeHtml = (html) => {
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const vscode = acquireVsCodeApi();

window.addEventListener('DOMContentLoaded', () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';

    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    const title = document.getElementById('title');
    const buttonGroup = document.getElementById('buttonGroup');
    const tabs = document.getElementById('tabs');
    const tabElements = {};

    window.setTitle = (html) => {
        title.innerHTML = html;
    };
    window.registerButton = (icon, name, callback) => {
        const button = document.createElement('vscode-button');
        button.setAttribute('icon', icon);
        button.innerText = name;
        button.style.marginRight = '10px';
        button.onclick = callback;
        buttonGroup.appendChild(button);
    };
    window.registerTab = (name) => {
        const tabHeader = document.createElement('vscode-tab-header');
        tabHeader.slot = 'header';
        tabHeader.setAttribute('disabled', true);
        const headerName = document.createElement('span');
        headerName.innerText = name;
        tabHeader.appendChild(headerName);
        const headerCount = document.createElement('vscode-badge');
        headerCount.setAttribute('variant', 'counter');
        headerCount.style.display = 'none';
        headerCount.style.marginLeft = '5px';
        tabHeader.appendChild(headerCount);
        const headerLoading = document.createElement('vscode-progress-ring');
        headerLoading.style.display = 'inline-block';
        headerLoading.style.marginLeft = '5px';
        headerLoading.style.height = '15px';
        headerLoading.style.width = '15px';
        tabHeader.appendChild(headerLoading);
        tabs.appendChild(tabHeader);

        const tabPanel = document.createElement('vscode-tab-panel');
        tabs.appendChild(tabPanel);
        tabElements[name] = [tabHeader, tabPanel];
    };
    window.focusTab = (name) => {
        tabs.setAttribute('selected-index', Object.keys(tabElements).indexOf(name));
    };
    window.setTabCount = (name, count) => {
        const tabCount = tabElements[name][0].children[1];
        tabCount.style.display = count ? '' : 'none';
        tabCount.innerText = count;
    };
    window.enableTab = (name, htmlContent) => {
        loading.style.display = 'none';
        content.style.display = '';
        const [header, panel] = tabElements[name];
        header.lastChild.style.display = 'none';
        if (htmlContent) {
            header.removeAttribute('disabled');
            panel.innerHTML = htmlContent;
        }
        MathJax.typeset();
        renderPdf();
        renderCode();
    };

    registerButton('refresh', 'Refresh', () => {
        vscode.postMessage({ command: 'refresh' });
        loading.style.display = 'flex';
        content.style.display = 'none';
        while (buttonGroup.children.length > 1) {
            buttonGroup.removeChild(buttonGroup.children[1]);
        }
    });
});
