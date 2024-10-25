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
    const title = document.getElementById('title');
    const gotoProblem = document.getElementById('gotoProblem');
    const compilerTexts = document.getElementById('compilerTexts');
    const submission = document.getElementById('submission');
    const lastCode = document.getElementById('lastCode');
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'notFound':
                submission.innerHTML = 'Submission not found';
                break;
            case 'submission':
                var submissionHTML = `<vscode-table zebra bordered-rows resizable columns='["10%", "40%", "10%", "20%", "20%"]'>
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>#</vscode-table-header-cell>
                        <vscode-table-header-cell>Status</vscode-table-header-cell>
                        <vscode-table-header-cell>Score</vscode-table-header-cell>
                        <vscode-table-header-cell>Time Cost</vscode-table-header-cell>
                        <vscode-table-header-cell>Memory Cost</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">`;
                const record = message.data.record;
                const subtasks = message.data.subtasks;

                title.innerHTML = `<span class="${statusIcon[record.status]} icon"></span>
                <span class="${statusIcon[record.status]}">${record.score} ${statusName[record.status]}</span>`;

                gotoProblem.addEventListener('click', () => {
                    vscode.postMessage({ command: 'openProblem', problemId: record.pid });
                });
                gotoProblem.disabled = false;

                const compilerTextsData = record.compilerTexts.join();
                const compilerTextsEditor = window.CodeMirror(compilerTexts, {
                    autoRefresh: true,
                    value: (compilerTextsData === '' ? 'No compiler texts' : compilerTextsData),
                    readOnly: true,
                    theme: 'material',
                });
                compilerTextsEditor.setSize('100%', 'auto');

                for (const [subtaskId, subtask] of Object.entries(subtasks)) {
                    submissionHTML += `<vscode-table-row class="subtask">
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
                        submissionHTML += `<vscode-table-row class="testCase">
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

                submissionHTML += `</vscode-table-body>
                </vscode-table>`;
                submission.innerHTML = submissionHTML;

                const lastCodeEditor = window.CodeMirror(lastCode, {
                    autoRefresh: true,
                    value: record.code,
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
