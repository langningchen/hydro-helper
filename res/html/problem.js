const vscode = window.acquireVsCodeApi();
window.MathJax = {
    tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
    },
};

window.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const title = document.getElementById('title');
    const submitProblem = document.getElementById('submitProblem');
    const problem = document.getElementById('problem');
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'problem':
                loading.style.display = 'none';

                title.innerText = '#' + message.data.problemId + '. ' + message.data.title;
                submitProblem.addEventListener('click', () => {
                    vscode.postMessage({ command: 'submitProblem', problemId: message.data.problemId });
                });
                submitProblem.disabled = false;
                problem.innerHTML = message.data.markdownContent.zh;
                window.MathJax.typeset();
                const pre = problem.getElementsByTagName('pre');
                const editors = [];
                for (let i = 0; i < pre.length; i++) {
                    const code = pre[i].innerText.trim();
                    const codeElement = document.createElement('div');
                    const copyButton = document.createElement('vscode-button');
                    copyButton.innerText = 'Copy';
                    copyButton.onclick = () => {
                        navigator.clipboard.writeText(code);
                        copyButton.innerText = 'Copied';
                        copyButton.disabled = true;
                        setTimeout(() => {
                            copyButton.innerText = 'Copy';
                            copyButton.disabled = false;
                        }, 1000);
                    };
                    codeElement.appendChild(copyButton);
                    const editorElement = document.createElement('div');
                    codeElement.appendChild(editorElement);
                    editors.push(window.CodeMirror(editorElement, {
                        autoRefresh: true,
                        value: code,
                        readOnly: true,
                        theme: 'material',
                    }));
                    pre[i].parentNode.replaceChild(codeElement, pre[i]);
                }
                for (let i = 0; i < editors.length; i++) {
                    editors[i].setSize('100%', 'auto');
                }
                break;
            default:
                break;
        }
    });
});
