window.addEventListener('DOMContentLoaded', () => {
    registerTab('Problem');
    registerTab('Solution');
    registerTab('Related');

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

                enableTab('Problem', parseMarkdown(data.pdoc.content.zh));
                focusTab('Problem');

                const contestList = data.ctdocs.concat(data.htdocs);
                contestList.sort((a, b) => new Date(b.beginAt) - new Date(a.beginAt));
                var relatedHTML = `<p>`;
                for (let i = 0; i < contestList.length; i++) {
                    const type = contestList[i].rule === 'homework' ? 'Homework' : 'Contest';
                    relatedHTML += `<vscode-label>${contestList[i].title}</vscode-label>`;
                    relatedHTML += `<vscode-button style="margin-right: 10px" onclick="vscode.postMessage({command: 'open${type.charAt(0)}', data: ['${contestList[i]._id}']})">Open ${type}</vscode-button>`;
                    relatedHTML += `<vscode-button style="margin-right: 10px" onclick="vscode.postMessage({command: 'openP', data: ['${contestList[i].pids}', '${contestList[i]._id}']}); vscode.postMessage({command: 'dispose'})">Open Problem in ${type}</vscode-button>`;
                    relatedHTML += `<vscode-divider></vscode-divider>`;
                }
                relatedHTML += `</p>`;
                enableTab('Related', relatedHTML);
                break;
            case 'solution':
                if (data.psdocs.length === 0) {
                    break;
                }
                var solutionHTML = '<p>';
                for (let i = 0; i < data.psdocs.length; i++) {
                    solutionHTML += `<vscode-badge style="background-color: var(--vscode-activityBarBadge-background);">${data.udict[data.psdocs[i].owner].uname}</vscode-badge>
                    <vscode-badge variant="counter">${data.psdocs[i].vote}</vscode-badge>`;
                    solutionHTML += `<p>${parseMarkdown(data.psdocs[i].content)}</p>`;
                    if (data.psdocs[i].reply.length > 0) {
                        const collapsible = document.createElement('vscode-collapsible');
                        solution.appendChild(collapsible);
                        collapsible.setAttribute('title', 'Reply');
                        for (let j = 0; j < data.psdocs[i].reply.length; j++) {
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
