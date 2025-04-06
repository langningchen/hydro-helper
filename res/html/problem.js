window.addEventListener('DOMContentLoaded', () => {
    window.registerTab('Info');
    window.registerTab('Problem');
    window.registerTab('Solution');
    window.registerTab('Related');
    window.registerTab('Files');
    window.registerTab('Record');

    window.setMessageHandler((message) => {
        const data = message.data;
        switch (message.command) {
            case 'problem': {
                if (message.error) {
                    window.enableTab('Problem', `<div class="center error">
                        <vscode-icon name="error" size="18"></vscode-icon>
                        <div>${message.error}</div>
                    </div>`);
                    return;
                }
                var title = '';
                if (data.rdoc) {
                    title += `<span class="icon record-status--icon ${window.statusIcon[data.rdoc.status]}"></span>
                    <span role="button" class="record-status--text" style="color: ${window.scoreColor[Math.floor(data.rdoc.score / 100 * 10)]}" onclick="window.vscode.postMessage({command:'openT',data:['${data.rdoc._id}']})">${data.rdoc.score ? `${data.rdoc.score}` : ``}</span> `;
                }
                if (!data.tdoc) {
                    var starStatus = !!data.psdoc?.star;
                    const starButton = document.createElement('vscode-icon');
                    starButton.id = 'starButton';
                    starButton.setAttribute('action-icon', '');
                    starButton.setAttribute('name', starStatus ? 'star-full' : 'star-empty');
                    starButton.setAttribute('onclick', 'star()');
                    starButton.setAttribute('size', '20');
                    window.star = () => {
                        window.vscode.postMessage({ command: 'starP', data: [data.pdoc.docId] });
                        starStatus = !starStatus;
                        document.getElementById('starButton').setAttribute('name', starStatus ? 'star-full' : 'star-empty');
                    };
                    title += starButton.outerHTML + " ";
                }
                title += `#${data.pdoc.docId}. ${data.pdoc.title} `;
                window.setTitle(title);

                const markdownContent = data.pdoc.content.zh || data.pdoc.content;

                window.registerButton('check', 'Submit', () => {
                    window.vscode.postMessage({ command: 'submitP', data: [data.pdoc.docId, data.tdoc?._id] });
                });
                window.registerButton('clippy', 'Send to CPH', () => {
                    const testCases = markdownContent.rawContent.matchAll(/.*输入.*\s*```(plain)?\n((.|\n)*?)```\s*.*输出.*\s*```(plain)?\n((.|\n)*?)```/g);
                    const problem = {
                        name: `${data.pdoc.docId}. ${data.pdoc.title}`,
                        url: data.pdoc.docId,
                        interactive: false,
                        memoryLimit: data.pdoc.config.memoryMax * 1024 * 1024,
                        timeLimit: data.pdoc.config.timeMax,
                        group: `Hydro`,
                        tests: [],
                        srcPath: '',
                        local: false,
                    };
                    for (const testCase of testCases) {
                        const input = testCase[2];
                        const output = testCase[5];
                        problem.tests.push({ input, output, id: problem.tests.length });
                    }
                    window.vscode.postMessage({ command: 'sendToCPH', data: [JSON.stringify(problem)] });
                });
                if (data.tdoc?._id !== undefined) {
                    window.registerButton('list-flat', 'Open in Problem Set', () => {
                        window.vscode.postMessage({ command: 'openP', data: [data.pdoc.docId] });
                        window.vscode.postMessage({ command: 'dispose' });
                    });
                    const type = data.tdoc.rule === 'homework' ? 'Homework' : 'Contest';
                    window.registerButton('checklist', `Open ${type}`, () => {
                        window.vscode.postMessage({ command: `open${type.charAt(0)}`, data: [data.tdoc._id] });
                    });
                }

                window.enableTab('Info', `<vscode-table zebra bordered-columns responsive resizable breakpoint="400" columns='["50%", "50%"]'>
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Name</vscode-table-header-cell>
                        <vscode-table-header-cell>Value</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">
                        <vscode-table-row>
                            <vscode-table-cell>Owner</vscode-table-cell>
                            <vscode-table-cell>${data.udoc.uname}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Time</vscode-table-cell>
                            <vscode-table-cell>${window.toTime(data.pdoc.config.timeMin)} ~ ${window.toTime(data.pdoc.config.timeMax)}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Memory</vscode-table-cell>
                            <vscode-table-cell>${window.toMemory(data.pdoc.config.memoryMin * 1024 * 1024)} ~ ${window.toMemory(data.pdoc.config.memoryMax * 1024 * 1024)}</vscode-table-cell>
                        </vscode-table-row>
                        ${data.pdoc.nSubmit ? `<vscode-table-row>
                            <vscode-table-cell>Submit</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.nSubmit}</vscode-table-cell>
                        </vscode-table-row>`: ``}
                        ${data.pdoc.nAccept ? `<vscode-table-row>
                            <vscode-table-cell>Accept</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.nAccept}</vscode-table-cell>
                        </vscode-table-row>`: ``}
                        ${data.pdoc.stats ? `<vscode-table-row>
                            <vscode-table-cell>Status (Accepted)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.AC}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Status (Wrong Answer)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.WA}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Status (Time Exceeded)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.TLE}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Status (Memory Exceeded)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.MLE}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Status (Runtime Error)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.RE}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Status (Compile Error)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.CE}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Status (System Error)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.SE}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Status (Ignored)</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.stats.IGN}</vscode-table-cell>
                        </vscode-table-row>`: ``}
                    </vscode-table-body>
                </vscode-table>`);

                window.copyMarkdown = () => {
                    const dummy = document.createElement('textarea');
                    document.body.appendChild(dummy);
                    dummy.value = markdownContent.rawContent;
                    dummy.select();
                    document.execCommand('copy');
                    document.body.removeChild(dummy);
                };
                var problemHTML = '<p>';
                if (data.pdoc.config.subType) {
                    problemHTML += `<div>
                        <i><b>File IO: ${data.pdoc.config.subType}</b></i>
                    </div>
                    <vscode-divider></vscode-divider>`;
                }
                problemHTML += `<vscode-button icon="copy" class="mr" onclick="copyMarkdown()">Copy</vscode-button>`;
                problemHTML += window.parseMarkdown(markdownContent);
                problemHTML += '</p>';
                window.enableTab('Problem', problemHTML);
                window.focusTab('Problem');

                const contestList = (data.ctdocs || []).concat(data.htdocs || []);
                var relatedHTML = '';
                if (contestList.length > 0) {
                    contestList.sort((a, b) => new Date(b.beginAt) - new Date(a.beginAt));
                    relatedHTML += `<p>`;
                    for (const contest of contestList) {
                        const type = contest.rule === 'homework' ? 'Homework' : 'Contest';
                        relatedHTML += `<vscode-label>${contest.title}</vscode-label>`;
                        relatedHTML += `<vscode-button class="mr" onclick="window.vscode.postMessage({command: 'open${type.charAt(0)}', data: ['${contest._id}']})">Open ${type}</vscode-button>`;
                        relatedHTML += `<vscode-button class="mr" onclick="window.vscode.postMessage({command: 'openP', data: ['${contest.pids}', '${contest._id}']}); window.vscode.postMessage({command: 'dispose'})">Open Problem in ${type}</vscode-button>`;
                        relatedHTML += `<vscode-divider></vscode-divider>`;
                    }
                    relatedHTML += `</p>`;
                }
                window.enableTab('Related', relatedHTML);
                window.setTabCount('Related', contestList.length);

                const files = (data.pdoc.additional_file || []).map((file) => {
                    return { ...file, type: 'additional_file', };
                }).concat(data.pdoc.data || []);
                var filesHTML = `<vscode-table zebra bordered-columns responsive resizable breakpoint="400" columns='["20%", "20%", "20%", "20%", "20%"]'>
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Filename</vscode-table-header-cell>
                        <vscode-table-header-cell>Last Modified</vscode-table-header-cell>
                        <vscode-table-header-cell>File Size</vscode-table-header-cell>
                        <vscode-table-header-cell>Storage Path</vscode-table-header-cell>
                        <vscode-table-header-cell>Action</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">`;
                for (const file of files) {
                    filesHTML += `<vscode-table-row>
                        <vscode-table-cell>${file.name}</vscode-table-cell>
                        <vscode-table-cell>${window.toRelativeTime(new Date(file.lastModified).getTime())}</vscode-table-cell>
                        <vscode-table-cell>${window.toMemory(file.size)}</vscode-table-cell>
                        <vscode-table-cell>${atob(file.etag)}</vscode-table-cell>
                        <vscode-table-cell>`;
                    if (file.type === 'additional_file') { filesHTML += `<a role="button" onclick="window.vscode.postMessage({command:'downloadFile',data:['/d/problemset/p/${data.pdoc.docId}/file/${file.name}?type=additional_file${data.tdoc?._id ? "&tid=" + data.tdoc?._id : ""}','${file.name}',${file.size}]})">Download file</a>`; }
                    filesHTML += `</vscode-table-cell>
                        </vscode-table-row>`;
                }
                filesHTML += `</vscode-table-body>
                </vscode-table>`;
                window.enableTab('Files', filesHTML);
                window.setTabCount('Files', files.filter(file => file.type === 'additional_file').length);
                break;
            }
            case 'solution': {
                if (message.error) {
                    window.enableTab('Solution', `<div class="center error">
                        <vscode-icon name="error" size="18"></vscode-icon>
                        <div>${message.error}</div>
                    </div>`);
                    return;
                }
                if (data === null) {
                    window.enableTab('Solution');
                    break;
                }
                const voteData = {};
                window.vote = (psid, vote) => {
                    if (voteData[psid] !== vote) {
                        const count = document.getElementById(psid + 'Count');
                        const upvote = document.getElementById(psid + 'Upvote');
                        const downvote = document.getElementById(psid + 'Downvote');
                        count.innerText = parseInt(count.innerText) + vote - (voteData[psid] ?? 0);
                        if (vote === 1) {
                            upvote.name = 'thumbsup-filled';
                            downvote.name = 'thumbsdown';
                        } else {
                            upvote.name = 'thumbsup';
                            downvote.name = 'thumbsdown-filled';
                        }
                        voteData[psid] = vote;
                        window.vscode.postMessage({ command: 'voteSolution', data: [data.pdoc.docId, psid, vote] });
                    }
                };

                var solutionHTML = '';
                if (data.psdocs.length !== 0) {
                    solutionHTML += '<p>';
                    for (const psdoc of data.psdocs) {
                        voteData[psdoc._id] = data.pssdict[psdoc._id]?.vote;
                        solutionHTML += `<div class="solutionContainer">
                        <div class="voteContainer mr">
                            <div>
                                <span class="voteNumber" id="${psdoc._id}Count">${psdoc.vote}</span>
                            </div>
                            <div>
                                <vscode-icon action-icon id="${psdoc._id}Upvote" name="thumbsup${voteData[psdoc._id] === 1 ? '-filled' : ''}" onclick="vote('${psdoc._id}',1)"></vscode-icon>
                                <vscode-icon action-icon id="${psdoc._id}Downvote" name="thumbsdown${voteData[psdoc._id] === -1 ? '-filled' : ''}" onclick="vote('${psdoc._id}',-1)"></vscode-icon>
                            </div>
                        </div>
                        <div>${data.udict[psdoc.owner].uname}</div>
                    </div>`;
                        solutionHTML += `<p>${window.parseMarkdown(psdoc.content)}</p>`;
                        if (psdoc.reply.length > 0) {
                            solutionHTML += `<vscode-collapsible title="Reply">`;
                            for (const reply of psdoc.reply) {
                                solutionHTML += `<div style="padding: 10px">
                                <vscode-badge>${data.udict[reply.owner].uname}</vscode-badge>
                                    ${window.parseMarkdown(reply.content)}
                                </div>`;
                            }
                            solutionHTML += '</vscode-collapsible>';
                        }
                        solutionHTML += `<vscode-divider></vscode-divider>`;
                    }
                    solutionHTML += '</p>';
                }
                window.enableTab('Solution', solutionHTML);
                window.setTabCount('Solution', data.psdocs.length);
                break;
            }
            case 'record': {
                if (message.error) {
                    window.enableTab('Record', `<div class="center error">
                        <vscode-icon name="error" size="18"></vscode-icon>
                        <div>${message.error}</div>
                    </div>`);
                    return;
                }
                var recordHTML = `
                <vscode-table zebra bordered-columns responsive resizable breakpoint="400">
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Status</vscode-table-header-cell>
                        <vscode-table-header-cell>Submit By</vscode-table-header-cell>
                        <vscode-table-header-cell>Time</vscode-table-header-cell>
                        <vscode-table-header-cell>Memory</vscode-table-header-cell>
                        <vscode-table-header-cell>Language</vscode-table-header-cell>
                        <vscode-table-header-cell>Submit At</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">`;
                for (const rdoc of data.rdocs) {
                    recordHTML += `<vscode-table-row>
                        <vscode-table-cell style="cursor: pointer" onclick="vscode.postMessage({command:'openT',data:['${rdoc._id}']})">
                            <span class="icon record-status--icon ${window.statusIcon[rdoc.status]}"></span>
                            <span style="color: ${window.scoreColor[Math.floor(rdoc.score / 100 * 10)]}">${rdoc.score}</span>
                            <span class="record-status--text ${window.statusIcon[rdoc.status]}">${window.statusName[rdoc.status]}</span>
                        </vscode-table-cell>
                        <vscode-table-cell>${data.udict[rdoc.uid].uname}</vscode-table-cell>
                        <vscode-table-cell>${window.toTime(rdoc.time)}</vscode-table-cell>
                        <vscode-table-cell>${window.toMemory(rdoc.memory * 1024)}</vscode-table-cell>
                        <vscode-table-cell>${window.languageDisplayName[rdoc.lang]}</vscode-table-cell>
                        <vscode-table-cell>${window.toRelativeTime(new Date(rdoc.judgeAt).getTime())}</vscode-table-cell>
                    </vscode-table-row>`;
                }
                recordHTML += `</vscode-table-body></vscode-table>`;
                window.enableTab('Record', recordHTML);
                window.setTabCount('Record', data.rdocs.length);
                break;
            }
            default:
                break;
        }
    });
});
