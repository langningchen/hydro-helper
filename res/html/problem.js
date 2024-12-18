window.addEventListener('DOMContentLoaded', () => {
    registerTab('Info');
    registerTab('Problem');
    registerTab('Solution');
    registerTab('Related');
    registerTab('Files');

    window.setMessageHandler((message) => {
        const data = message.data;
        switch (message.command) {
            case 'problem':
                setTitle('#' + data.pdoc.docId + '. ' + data.pdoc.title);

                registerButton('check', 'Submit', () => {
                    vscode.postMessage({ command: 'submitProblem', data: [data.pdoc.docId, data.tdoc?._id] });
                });
                if (data.tdoc?._id !== undefined) {
                    registerButton('list-flat', 'Open in Problem Set', () => {
                        vscode.postMessage({ command: 'openP', data: [data.pdoc.docId] });
                        vscode.postMessage({ command: 'dispose' });
                    });
                    const type = data.tdoc.rule === 'homework' ? 'Homework' : 'Contest';
                    registerButton('checklist', `Open ${type}`, () => {
                        vscode.postMessage({ command: `open${type.charAt(0)}`, data: [data.tdoc._id] });
                    });
                }

                enableTab('Info', `<vscode-table zebra bordered-columns responsive resizable breakpoint="400" columns='["50%", "50%"]'>
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
                            <vscode-table-cell>${toTime(data.pdoc.config.timeMin)} ~ ${toTime(data.pdoc.config.timeMax)}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Memory</vscode-table-cell>
                            <vscode-table-cell>${toMemory(data.pdoc.config.memoryMin * 1024 * 1024)} ~ ${toMemory(data.pdoc.config.memoryMax * 1024 * 1024)}</vscode-table-cell>
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

                const markdownContent = data.pdoc.content.zh || data.pdoc.content;
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
                problemHTML += parseMarkdown(markdownContent);
                problemHTML += '</p>';
                enableTab('Problem', problemHTML);
                focusTab('Problem');

                const contestList = (data.ctdocs || []).concat(data.htdocs || []);
                var relatedHTML = '';
                if (contestList.length > 0) {
                    contestList.sort((a, b) => new Date(b.beginAt) - new Date(a.beginAt));
                    relatedHTML += `<p>`;
                    for (const contest of contestList) {
                        const type = contest.rule === 'homework' ? 'Homework' : 'Contest';
                        relatedHTML += `<vscode-label>${contest.title}</vscode-label>`;
                        relatedHTML += `<vscode-button class="mr" onclick="vscode.postMessage({command: 'open${type.charAt(0)}', data: ['${contest._id}']})">Open ${type}</vscode-button>`;
                        relatedHTML += `<vscode-button class="mr" onclick="vscode.postMessage({command: 'openP', data: ['${contest.pids}', '${contest._id}']}); vscode.postMessage({command: 'dispose'})">Open Problem in ${type}</vscode-button>`;
                        relatedHTML += `<vscode-divider></vscode-divider>`;
                    }
                    relatedHTML += `</p>`;
                }
                enableTab('Related', relatedHTML);
                setTabCount('Related', contestList.length);

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
                        <vscode-table-cell>${toRelativeTime(new Date(file.lastModified).getTime())}</vscode-table-cell>
                        <vscode-table-cell>${toMemory(file.size)}</vscode-table-cell>
                        <vscode-table-cell>${atob(file.etag)}</vscode-table-cell>
                        <vscode-table-cell>`;
                    if (file.type === 'additional_file') { filesHTML += `<a role="button" onclick="vscode.postMessage({command:'downloadFile',data:['/d/problemset/p/${data.pdoc.docId}/file/${file.name}?type=additional_file','${file.name}',${file.size}]})">Download file</a>`; }
                    filesHTML += `</vscode-table-cell>
                        </vscode-table-row>`;
                }
                filesHTML += `</vscode-table-body>
                </vscode-table>`;
                enableTab('Files', filesHTML);
                setTabCount('Files', files.filter(file => file.type === 'additional_file').length);
                break;
            case 'solution':
                if (data === null) {
                    enableTab('Solution');
                    break;
                }
                const voteData = {};
                window.vote = (psid, vote) => {
                    if (voteData[psid] !== vote) {
                        const count = document.getElementById(psid + 'Count');
                        const upvote = document.getElementById(psid + 'Upvote');
                        const downvote = document.getElementById(psid + 'Downvote');
                        if (vote === 1) {
                            count.innerText = parseInt(count.innerText) + 2;
                            upvote.name = 'thumbsup-filled';
                            downvote.name = 'thumbsdown';
                        } else {
                            count.innerText = parseInt(count.innerText) - 2;
                            upvote.name = 'thumbsup';
                            downvote.name = 'thumbsdown-filled';
                        }
                        voteData[psid] = vote;
                        vscode.postMessage({ command: 'voteSolution', data: [data.pdoc.docId, psid, vote] });
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
                        solutionHTML += `<p>${parseMarkdown(psdoc.content)}</p>`;
                        if (psdoc.reply.length > 0) {
                            const collapsible = document.createElement('vscode-collapsible');
                            solution.appendChild(collapsible);
                            collapsible.setAttribute('title', 'Reply');
                            for (const reply of psdoc.reply) {
                                collapsible.innerHTML += `<div style="padding: 10px">
                            <vscode-badge>${data.udict[reply.owner].uname}</vscode-badge>
                                ${parseMarkdown(reply.content)}
                            </div>`;
                            }
                        }
                        solutionHTML += `<vscode-divider></vscode-divider>`;
                    }
                    solutionHTML += '</p>';
                }
                enableTab('Solution', solutionHTML);
                setTabCount('Solution', data.psdocs.length);
                break;
            default:
                break;
        }
    });
});
