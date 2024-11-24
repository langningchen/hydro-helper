window.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');

    content.innerHTML = `<h1 id="title"></h1>
<vscode-button disabled icon="check" id="submitProblem">Submit</vscode-button>
<vscode-button disabled icon="refresh" id="refresh">Refresh</vscode-button>
<vscode-button disabled icon="send" id="openInProblemSet">Open in Problem Set</vscode-button>
<vscode-tabs selected-index="0">
    <vscode-tab-header slot="header" id="problemTab">Problem</vscode-tab-header><vscode-tab-panel><p id="problem"></p></vscode-tab-panel>
    <vscode-tab-header slot="header" id="solutionTab">Solution</vscode-tab-header><vscode-tab-panel><p id="solution"></p></vscode-tab-panel>
</vscode-tabs>`;

    const title = document.getElementById('title');
    const submitProblem = document.getElementById('submitProblem');
    const refresh = document.getElementById('refresh');
    const openInProblemSet = document.getElementById('openInProblemSet');
    const problemTab = document.getElementById('problemTab');
    const problem = document.getElementById('problem');
    const solutionTab = document.getElementById('solutionTab');
    const solution = document.getElementById('solution');

    window.onmessage = event => {
        loading.style.display = 'none';
        content.style.display = '';
        const message = event.data;
        const data = message.data;
        switch (message.command) {
            case 'problem':
                problemTab.style.display = 'unset';
                title.innerText = '#' + data.pid + '. ' + data.title;

                submitProblem.onclick = () => {
                    vscode.postMessage({ command: 'submitProblem', data: [data.pid, data.tid] });
                };
                submitProblem.disabled = false;
                refresh.onclick = () => {
                    vscode.postMessage({ command: 'refresh' });
                    loading.style.display = 'flex';
                    content.style.display = 'none';
                };
                refresh.disabled = false;
                openInProblemSet.onclick = () => {
                    vscode.postMessage({ command: 'openP', data: [data.pid] });
                };
                openInProblemSet.disabled = data.tid === undefined;

                problem.innerHTML = parseMarkdown(data.markdownContent.zh);
                break;
            case 'solution':
                if (data.psdocs.length === 0) {
                    break;
                }
                solutionTab.style.display = 'unset';
                solution.innerHTML = '';
                for (let i = 0; i < data.psdocs.length; i++) {
                    solution.innerHTML += `<vscode-badge style="background-color: var(--vscode-activityBarBadge-background);">${data.udict[data.psdocs[i].owner].uname}</vscode-badge>
                    <vscode-badge variant="counter">${data.psdocs[i].vote}</vscode-badge>`;
                    solution.innerHTML += `<p>${parseMarkdown(data.psdocs[i].content)}</p>`;
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
