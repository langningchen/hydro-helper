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
const statusRealIcon = {
    'pending': '',
    'pass': '',
    'fail': '',
    'progress': '',
    'ignored': '',
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

const vscode = acquireVsCodeApi();
const formatString = (str) => {
    if (typeof str === 'string') {
        return str;
    }
    var message = str.message;
    for (var i = 0; i < str.params.length; i++) {
        message = message.replace('{' + i + '}', str.params[i]);
    }
    return message;
};
window.MathJax = {
    tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
    },
};

window.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const title = document.getElementById('title');
    const gotoProblem = document.getElementById('gotoProblem');
    const info = document.getElementById('info');
    const compilerTexts = document.getElementById('compilerTexts');
    const record = document.getElementById('Record');
    const lastCode = document.getElementById('lastCode');
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'record':
                loading.style.display = 'none';

                const data = message.data;
                data.rdoc.testCases.sort((a, b) => a.id - b.id);

                var parsedSubtasks = {};
                for (const [key, value] of Object.entries(data.rdoc.subtasks)) {
                    parsedSubtasks[parseInt(key)] = {
                        score: value.score,
                        status: value.status,
                        testCase: [],
                    };
                }
                for (const testCase of data.rdoc.testCases) {
                    if (parsedSubtasks[testCase.subtaskId] === undefined) {
                        parsedSubtasks[testCase.subtaskId] = {
                            score: 0,
                            status: 30,
                            testCase: [],
                        };
                    }
                    parsedSubtasks[testCase.subtaskId].testCase.push(testCase);
                }

                title.innerHTML = `<span class="${statusIcon[data.rdoc.status]} icon"></span>
                <span class="${statusIcon[data.rdoc.status]}">${data.rdoc.score} ${statusName[data.rdoc.status]}</span>`;

                gotoProblem.addEventListener('click', () => {
                    vscode.postMessage({ command: 'openProblem', problemId: data.rdoc.pid });
                });
                gotoProblem.disabled = false;

                info.innerHTML = `<vscode-table zebra bordered-columns responsive breakpoint="400">
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Name</vscode-table-header-cell>
                        <vscode-table-header-cell>Value</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">
                        <vscode-table-row>
                            <vscode-table-cell>Submit By</vscode-table-cell>
                            <vscode-table-cell>${data.udoc.uname}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Problem</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.title}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Language</vscode-table-cell>
                            <vscode-table-cell>${languageDisplayName[data.rdoc.lang]}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Code Length</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc.code.length}B</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Judge At</vscode-table-cell>
                            <vscode-table-cell>${new Date(data.rdoc.judgeAt).toLocaleString()}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row style="border-top-width: 2px;">
                            <vscode-table-cell>Score</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc.score}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Total Time</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc.time}ms</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Peak Time</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc.testCases.reduce((acc, cur) => Math.max(acc, cur.time), 0)}ms</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Peak Memory</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc.memory}KiB</vscode-table-cell>
                        </vscode-table-row>
                    </vscode-table-body>
                </vscode-table>`;

                const compilerTextsData = data.rdoc.compilerTexts.join();
                const compilerTextsEditor = window.CodeMirror(compilerTexts, {
                    autoRefresh: true,
                    value: (compilerTextsData === '' ? 'No compiler texts' : compilerTextsData),
                    readOnly: true,
                    theme: 'material',
                });
                compilerTextsEditor.setSize('100%', 'auto');

                var recordHTML = `<vscode-table zebra bordered-rows resizable columns='["10%", "40%", "10%", "20%", "20%"]'>
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>#</vscode-table-header-cell>
                        <vscode-table-header-cell>Status</vscode-table-header-cell>
                        <vscode-table-header-cell>Score</vscode-table-header-cell>
                        <vscode-table-header-cell>Time Cost</vscode-table-header-cell>
                        <vscode-table-header-cell>Memory Cost</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">`;
                for (const [subtaskId, subtask] of Object.entries(parsedSubtasks)) {
                    recordHTML += `<vscode-table-row class="subtask">
                        <vscode-table-cell>${'#' + subtaskId}</vscode-table-cell>
                        <vscode-table-cell>
                            <span class="${statusIcon[subtask.status]} icon"></span>
                            <span class="${statusIcon[subtask.status]}">${statusName[subtask.status]}</span>
                        </vscode-table-cell>
                        <vscode-table-cell>${subtask.score}</vscode-table-cell>
                        <vscode-table-cell></vscode-table-cell>
                        <vscode-table-cell></vscode-table-cell>
                    </vscode-table-row>`;

                    for (const testCase of subtask.testCase) {
                        recordHTML += `<vscode-table-row class="testCase">
                            <vscode-table-cell class="border-${statusIcon[testCase.status]}">${'#' + subtaskId + '-' + testCase.id}</vscode-table-cell>
                            <vscode-table-cell>
                                <span class="${statusIcon[testCase.status]} icon"></span>
                                <span class="${statusIcon[testCase.status]}">${statusName[testCase.status]}</span>
                                <span style="margin-left: 10px;">${formatString(testCase.message)}</span>
                            </vscode-table-cell>
                            <vscode-table-cell>${testCase.score}</vscode-table-cell>
                            <vscode-table-cell>${testCase.time}ms</vscode-table-cell>
                            <vscode-table-cell>${testCase.memory}KiB</vscode-table-cell>
                        </vscode-table-row>`;
                    }
                }

                recordHTML += `</vscode-table-body>
                </vscode-table>`;
                record.innerHTML = recordHTML;

                const lastCodeEditor = window.CodeMirror(lastCode, {
                    autoRefresh: true,
                    value: data.rdoc.code,
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
                });
                lastCodeEditor.setSize('100%', 'auto');
                break;
            default:
                break;
        }
    });
});
