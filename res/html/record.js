window.addEventListener('DOMContentLoaded', () => {
    window.registerTab('Info');
    window.registerTab('Judge result');
    window.registerTab('Compiler Texts');
    window.registerTab('Judge Texts');
    window.registerTab('Code');

    window.setMessageHandler((message) => {
        const data = message.data;
        switch (message.command) {
            case 'info': {
                window.registerButton('arrow-right', 'Go to Problem', () => {
                    window.vscode.postMessage({ command: 'openP', data: [data.rdoc.pid, data.rdoc.contest] });
                });

                window.enableTab('Info', `<vscode-table zebra bordered-columns responsive resizable breakpoint="400" columns='["50%", "50%"]'>
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Name</vscode-table-header-cell>
                        <vscode-table-header-cell>Value</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">
                        <vscode-table-row>
                            <vscode-table-cell>ID</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc._id}</vscode-table-cell>
                        </vscode-table-row>
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
                            <vscode-table-cell>${window.languageDisplayName[data.rdoc.lang]}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Code Length</vscode-table-cell>
                            <vscode-table-cell>${window.toMemory(data.rdoc.code.length)}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Judge At</vscode-table-cell>
                            <vscode-table-cell>${window.toRelativeTime(new Date(data.rdoc.judgeAt).getTime())}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Score</vscode-table-cell>
                            <vscode-table-cell>${data.rdoc.score}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Total Time</vscode-table-cell>
                            <vscode-table-cell>${window.toTime(data.rdoc.time)}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Peak Time</vscode-table-cell>
                            <vscode-table-cell>${window.toTime(data.rdoc.testCases.reduce((acc, cur) => Math.max(acc, cur.time), 0))}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Peak Memory</vscode-table-cell>
                            <vscode-table-cell>${window.toMemory(data.rdoc.memory)}</vscode-table-cell>
                        </vscode-table-row>
                    </vscode-table-body>
                </vscode-table>`);

                window.enableTab('Compiler Texts', data.rdoc.compilerTexts.length ? `<pre>${window.sanitizeHtml(data.rdoc.compilerTexts.join('\n'))}</pre>` : '');
                window.enableTab('Judge Texts', data.rdoc.judgeTexts.length ? `<pre>${window.sanitizeHtml(data.rdoc.judgeTexts.map((text) => window.formatString(text)).join('\n'))}</pre>` : '');
                window.enableTab('Code', data.rdoc.code ? `<pre>${window.sanitizeHtml(data.rdoc.code)}</pre>` : '');
                break;
            }
            case 'record': {
                const parsedSubtasks = {};
                let status = undefined;
                let score = undefined;
                if (data.status_html) {
                    const html = data.status_html;
                    const doc = new DOMParser().parseFromString(html, 'text/html');

                    const title = doc.querySelector('.section__title');
                    score = parseInt(title.querySelector('.record-status--text').previousElementSibling.innerText.trim());
                    status = parseInt(window.findIndex(window.statusName, title.querySelector('.record-status--text').innerText.trim()));

                    const subtasks = doc.querySelectorAll('.subtask');
                    for (const subtask of subtasks) {
                        const subtaskId = subtask.querySelector('.col--case').innerText.trim().replace('#', '');
                        let status = 0;
                        let score = 0;
                        if (subtask.querySelector('.record-status--text') !== null) {
                            status = parseInt(window.findIndex(window.statusName, subtask.querySelector('.record-status--text').innerText.trim()));
                            score = parseInt(subtask.querySelector('.record-status--text').nextElementSibling.innerText.trim());
                        }
                        parsedSubtasks[subtaskId] = {
                            status: status,
                            score: score,
                            testCase: []
                        };
                    }
                    const testCases = doc.querySelectorAll((subtasks.length === 0) ? '.subtask-case' : '.case');
                    if (Object.keys(parsedSubtasks).length === 0 && testCases.length > 0) {
                        parsedSubtasks[1] = {
                            status: status,
                            score: score,
                            testCase: []
                        };
                    }
                    for (const testCase of testCases) {
                        var [subtaskId, testCaseId] = testCase.querySelector('.col--case').innerText.trim().replace('#', '').split('-');
                        if (testCaseId === undefined) {
                            testCaseId = subtaskId;
                            subtaskId = 1;
                        }
                        const status = parseInt(window.findIndex(window.statusName, testCase.querySelector('.record-status--text').innerText.trim()));
                        const score = parseInt(testCase.querySelector('.record-status--text').nextElementSibling.innerText.trim());
                        const time = window.parseTime(testCase.querySelector('.col--time').innerText.trim()) || 0;
                        const memory = window.parseMemory(testCase.querySelector('.col--memory').innerText.trim()) || 0;
                        const message = testCase.querySelector('.message').innerText.trim();
                        parsedSubtasks[subtaskId].testCase.push({
                            id: parseInt(testCaseId),
                            status: status,
                            score: score || 0,
                            time: time,
                            memory: memory,
                            message: message
                        });
                    }
                } else {
                    status = data.rdoc.status;
                    score = data.rdoc.score;

                    data.rdoc.testCases.sort((a, b) => a.id - b.id);
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
                }

                window.setTitle(`<span class="icon record-status--icon ${window.statusIcon[status]}"></span>
                <span class="record-status--text" style="color: ${window.scoreColor[Math.floor(score / 100 * 10)]}">${score !== undefined ? `${score} ` : ``}</span>
                <span class="record-status--text ${window.statusIcon[status]}">${window.statusName[status]}</span>`);

                if (Object.keys(parsedSubtasks).length > 0) {
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
                            <span class="icon record-status--icon ${window.statusIcon[subtask.status]}"></span>
                            <span class="record-status--text ${window.statusIcon[subtask.status]}">${window.statusName[subtask.status]}</span>
                        </vscode-table-cell>
                        <vscode-table-cell>${subtask.score}</vscode-table-cell>
                        <vscode-table-cell></vscode-table-cell>
                        <vscode-table-cell></vscode-table-cell>
                    </vscode-table-row>`;

                        for (const testCase of subtask.testCase) {
                            recordHTML += `<vscode-table-row class="testCase">
                            <vscode-table-cell class="record-status--border ${window.statusIcon[testCase.status]}">${'#' + subtaskId + '-' + testCase.id}</vscode-table-cell>
                            <vscode-table-cell>
                                <span class="icon record-status--icon ${window.statusIcon[testCase.status]}"></span>
                                <span class="record-status--text ${window.statusIcon[testCase.status]}">${window.statusName[testCase.status]}</span>
                                <span class="mr">${window.formatString(testCase.message)}</span>
                            </vscode-table-cell>
                            <vscode-table-cell>${testCase.score}</vscode-table-cell>
                            <vscode-table-cell>${window.toTime(testCase.time)}</vscode-table-cell>
                            <vscode-table-cell>${window.toMemory(testCase.memory)}</vscode-table-cell>
                        </vscode-table-row>`;
                        }
                    }
                    recordHTML += `</vscode-table-body>
                </vscode-table>`;
                    window.enableTab('Judge result', recordHTML);
                    window.focusTab('Judge result');
                } else {
                    window.enableTab('Judge result');
                }
                break;
            }
            default:
                break;
        }
    });
});
