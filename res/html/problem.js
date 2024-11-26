window.addEventListener('DOMContentLoaded', () => {
    registerTab('Info');
    registerTab('Problem');
    registerTab('Solution');
    registerTab('Related');
    registerTab('Files');

    window.onmessage = event => {
        const message = event.data;
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

                enableTab('Info', `<vscode-table zebra bordered-columns responsive breakpoint="400">
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
                            <vscode-table-cell>Submit</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.nSubmit}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Accept</vscode-table-cell>
                            <vscode-table-cell>${data.pdoc.nAccept}</vscode-table-cell>
                        </vscode-table-row>
                        ${data.pdoc.stats && `<vscode-table-row>
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
                        </vscode-table-row>`}$
                    </vscode-table-body>
                </vscode-table>`);

                var problemHTML = '<p>';
                if (data.pdoc.config.subType) {
                    problemHTML += `<div>
                        <i><b>File IO: ${data.pdoc.config.subType}</b></i>
                    </div>
                    <vscode-divider></vscode-divider>`;
                }
                problemHTML += parseMarkdown(data.pdoc.content.zh);
                problemHTML += '</p>';
                enableTab('Problem', problemHTML);
                focusTab('Problem');

                const contestList = data.ctdocs.concat(data.htdocs);
                if (contestList.length !== 0) {
                    contestList.sort((a, b) => new Date(b.beginAt) - new Date(a.beginAt));
                    var relatedHTML = `<p>`;
                    for (var i = 0; i < contestList.length; i++) {
                        const type = contestList[i].rule === 'homework' ? 'Homework' : 'Contest';
                        relatedHTML += `<vscode-label>${contestList[i].title}</vscode-label>`;
                        relatedHTML += `<vscode-button style="margin-right: 10px" onclick="vscode.postMessage({command: 'open${type.charAt(0)}', data: ['${contestList[i]._id}']})">Open ${type}</vscode-button>`;
                        relatedHTML += `<vscode-button style="margin-right: 10px" onclick="vscode.postMessage({command: 'openP', data: ['${contestList[i].pids}', '${contestList[i]._id}']}); vscode.postMessage({command: 'dispose'})">Open Problem in ${type}</vscode-button>`;
                        relatedHTML += `<vscode-divider></vscode-divider>`;
                    }
                    relatedHTML += `</p>`;
                    enableTab('Related', relatedHTML);
                }

                debugger;
                const fileList = data.pdoc.additional_file.map((i) => {
                    return { ...i, type: 'additional_file', };
                }).concat(data.pdoc.data);
                var filesHTML = `<vscode-table zebra bordered-rows resizable>
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Filename</vscode-table-header-cell>
                        <vscode-table-header-cell>Last Modified</vscode-table-header-cell>
                        <vscode-table-header-cell>File Size</vscode-table-header-cell>
                        <vscode-table-header-cell>Storage Path</vscode-table-header-cell>
                        <vscode-table-header-cell>Action</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">`;
                for (const i of fileList) {
                    filesHTML += `<vscode-table-row>
                        <vscode-table-cell>${i.name}</vscode-table-cell>
                        <vscode-table-cell>${toRelativeTime(new Date(i.lastModified).getTime())}</vscode-table-cell>
                        <vscode-table-cell>${toMemory(i.size)}</vscode-table-cell>
                        <vscode-table-cell>${atob(i.etag)}</vscode-table-cell>
                        <vscode-table-cell>`;
                    if (i.type === 'additional_file') { filesHTML += `<a style="cursor: pointer" onclick="vscode.postMessage({command:'downloadFile',data:['/d/problemset/p/${data.pdoc.docId}/file/${i.name}?type=additional_file','${i.name}',${i.size}]})">Download file</a>`; }
                    filesHTML += `</vscode-table-cell>
                        </vscode-table-row>`;
                }
                filesHTML += `</vscode-table-body>
                </vscode-table>`;
                enableTab('Files', filesHTML);
                break;
            case 'solution':
                if (data.psdocs.length === 0) {
                    break;
                }
                var solutionHTML = '<p>';
                for (var i = 0; i < data.psdocs.length; i++) {
                    solutionHTML += `<vscode-badge style="background-color: var(--vscode-activityBarBadge-background);">${data.udict[data.psdocs[i].owner].uname}</vscode-badge>
                    <vscode-badge variant="counter">${data.psdocs[i].vote}</vscode-badge>`;
                    solutionHTML += `<p>${parseMarkdown(data.psdocs[i].content)}</p>`;
                    if (data.psdocs[i].reply.length > 0) {
                        const collapsible = document.createElement('vscode-collapsible');
                        solution.appendChild(collapsible);
                        collapsible.setAttribute('title', 'Reply');
                        for (var j = 0; j < data.psdocs[i].reply.length; j++) {
                            collapsible.innerHTML += `<div style="padding: 10px">
                            <vscode-badge>${data.udict[data.psdocs[i].reply[j].owner].uname}</vscode-badge>
                                ${parseMarkdown(data.psdocs[i].reply[j].content)}
                            </div>`;
                        }
                    }
                    solutionHTML += `<vscode-divider></vscode-divider>`;
                }
                solutionHTML += '</p>';
                enableTab('Solution', solutionHTML);
                break;
            default:
                break;
        }
    };
});
