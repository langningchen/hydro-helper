window.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    const title = document.getElementById('title');
    const gotoProblem = document.getElementById('gotoProblem');
    const refresh = document.getElementById('refresh');
    const info = document.getElementById('info');
    const compilerTexts = document.getElementById('compilerTexts');
    const record = document.getElementById('record');
    const lastCode = document.getElementById('lastCode');
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'record':
                loading.style.display = 'none';
                content.style.display = '';

                const data = message.data;
                data.rdoc.testCases.sort((a, b) => a.id - b.id);

                var parsedSubtasks = {};
                if (data.rdoc.subtasks !== undefined) {
                    for (const [key, value] of Object.entries(data.rdoc.subtasks)) {
                        parsedSubtasks[parseInt(key)] = {
                            score: value.score,
                            status: value.status,
                            testCase: [],
                        };
                    }
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
                    vscode.postMessage({ command: 'openP', problemId: data.rdoc.pid, contestId: data.rdoc.contest });
                });
                gotoProblem.disabled = false;
                refresh.addEventListener('click', () => {
                    vscode.postMessage({ command: 'refresh' });
                    loading.style.display = 'flex';
                    content.style.display = 'none';
                });
                refresh.disabled = false;

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
                            <vscode-table-cell>${toMemory(data.rdoc.code.length)}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Judge At</vscode-table-cell>
                            <vscode-table-cell>${toRelativeTime(new Date(data.rdoc.judgeAt).getTime())}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row style="border-top-width: 2px;">
                            <vscode-table-cell>Score</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc.score}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Total Time</vscode-table-cell>
                            <vscode-table-cell>${toTime(data.rdoc.time)}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Peak Time</vscode-table-cell>
                            <vscode-table-cell>${toTime(data.rdoc.testCases.reduce((acc, cur) => Math.max(acc, cur.time), 0))}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Peak Memory</vscode-table-cell>
                            <vscode-table-cell>${toMemory(data.rdoc.memory)}</vscode-table-cell>
                        </vscode-table-row>
                    </vscode-table-body>
                </vscode-table>`;

                const compilerTextsData = data.rdoc.compilerTexts.join();
                if (compilerTextsData === '') {
                    compilerTexts.innerHTML = `<p>No compiler texts</p>`;
                } else {
                    const compilerTextsEditor = window.CodeMirror(compilerTexts, {
                        autoRefresh: true,
                        value: compilerTextsData,
                        readOnly: true,
                        theme: 'material',
                    });
                    compilerTextsEditor.setSize('100%', 'auto');
                }

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
                            <vscode-table-cell>${toTime(testCase.time)}</vscode-table-cell>
                            <vscode-table-cell>${toMemory(testCase.memory)}</vscode-table-cell>
                        </vscode-table-row>`;
                    }
                }

                recordHTML += `</vscode-table-body>
                </vscode-table>`;
                record.innerHTML = recordHTML;

                if (data.rdoc.code === '') {
                    lastCode.innerHTML = `<p>Code is not available to display</p>`;
                } else {
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
                }
                break;
            default:
                break;
        }
    });
});
