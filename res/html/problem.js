window.addEventListener('DOMContentLoaded', () => {
    registerTab('Problem');
    registerTab('Solution');

    window.onmessage = event => {
        const message = event.data;
        const data = message.data;
        switch (message.command) {
            case 'problem':
                setTitle('#' + data.pid + '. ' + data.title);

                registerButton('check', 'Submit', () => {
                    vscode.postMessage({ command: 'submitProblem', data: [data.pid, data.tid] });
                });
                if (data.tid !== undefined) {
                    registerButton('send', 'Open in Problem Set', () => {
                        vscode.postMessage({ command: 'openP', data: [data.pid] });
                        vscode.postMessage({ command: 'dispose' });
                    });
                }

                enableTab('Problem', parseMarkdown(data.markdownContent.zh));
                focusTab('Problem');
                break;
            case 'solution':
                if (data.psdocs.length === 0) {
                    break;
                }
                var solutionHTML = '';
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
                enableTab('Solution', solutionHTML);
                break;
            default:
                break;
        }
    };
});
