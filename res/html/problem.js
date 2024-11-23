window.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');

    content.innerHTML = `<h1 id="title"></h1>
<vscode-button disabled icon="check" id="submitProblem">Submit</vscode-button>
<vscode-button disabled icon="refresh" id="refresh">Refresh</vscode-button>
<vscode-button disabled icon="send" id="openInProblemSet">Open in Problem Set</vscode-button>
<vscode-tabs selected-index="0" id="tabs"></vscode-tabs>`;

    const title = document.getElementById('title');
    const submitProblem = document.getElementById('submitProblem');
    const refresh = document.getElementById('refresh');
    const openInProblemSet = document.getElementById('openInProblemSet');
    const tabs = document.getElementById('tabs');

    window.onmessage = event => {
        loading.style.display = 'none';
        content.style.display = '';
        const message = event.data;
        switch (message.command) {
            case 'problem':
                title.innerText = '#' + message.data.pid + '. ' + message.data.title;
                tabs.innerHTML += `<vscode-tab-header slot="header">Problem</vscode-tab-header><vscode-tab-panel><p id="problem"></p></vscode-tab-panel>`;
                const problem = document.getElementById('problem');

                submitProblem.onclick = () => {
                    vscode.postMessage({ command: 'submitProblem', data: [message.data.pid, message.data.tid] });
                };
                submitProblem.disabled = false;
                refresh.onclick = () => {
                    vscode.postMessage({ command: 'refresh' });
                    loading.style.display = 'flex';
                    content.style.display = 'none';
                };
                refresh.disabled = false;
                openInProblemSet.onclick = () => {
                    vscode.postMessage({ command: 'openP', data: [message.data.pid] });
                };
                openInProblemSet.disabled = message.data.tid === undefined;

                problem.innerHTML = parseMarkdown(message.data.markdownContent.zh);
                break;
            case 'solution':
                if (message.data.psdocs.length === 0) {
                    break;
                }
                tabs.innerHTML += `<vscode-tab-header slot="header">Solution</vscode-tab-header><vscode-tab-panel><p id="solution"></p></vscode-tab-panel>`;
                const solution = document.getElementById('solution');
                solution.innerHTML = '';
                for (let i = 0; i < message.data.psdocs.length; i++) {
                    solution.innerHTML += `<vscode-badge style="background-color: var(--vscode-activityBarBadge-background);">${message.data.udict[message.data.psdocs[i].owner].uname}</vscode-badge>
                    <vscode-badge variant="counter">${message.data.psdocs[i].vote}</vscode-badge>`;
                    solution.innerHTML += `<p>${parseMarkdown(message.data.psdocs[i].content)}</p>`;
                    if (message.data.psdocs[i].reply.length > 0) {
                        const collapsible = document.createElement('vscode-collapsible');
                        solution.appendChild(collapsible);
                        collapsible.setAttribute('title', 'Reply');
                        for (let j = 0; j < message.data.psdocs[i].reply.length; j++) {
                            collapsible.innerHTML += `<div style="padding: 10px">
                            <vscode-badge>${message.data.udict[message.data.psdocs[i].reply[j].owner].uname}</vscode-badge>
                                ${parseMarkdown(message.data.psdocs[i].reply[j].content)}
                            </div>`;
                        }
                    }
                    solution.innerHTML += `<vscode-divider></vscode-divider>`;
                }
                break;
            default:
                break;
        }
        window.MathJax.typeset();
        renderPdf();
        renderCode();
    };
});
