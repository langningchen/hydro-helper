const contestRuleName = {
    'acm': 'ACM/ICPC',
    'oi': 'OI',
    'ioi': 'IOI',
    'strictioi': 'IOI(Strict)',
    'ledo': 'Ledo',
    'homework': 'Assignment',
};
const scoreColor = [
    '#ff4f4f',
    '#ff694f',
    '#f8603a',
    '#fc8354',
    '#fa9231',
    '#f7bb3b',
    '#ecdb44',
    '#e2ec52',
    '#b0d628',
    '#93b127',
    '#25ad40',
];

const vscode = acquireVsCodeApi();
window.MathJax = {
    tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
    },
};

window.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    const title = document.getElementById('title');
    const info = document.getElementById('info');
    const scoreboard = document.getElementById('scoreboard');
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'contest':
                loading.style.display = 'none';
                content.style.display = '';

                const data = message.data;

                title.innerHTML = `${data.tdoc.title}`;

                // TODO: display the owner name
                info.innerHTML = `<vscode-table zebra bordered-columns responsive breakpoint="400">
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Name</vscode-table-header-cell>
                        <vscode-table-header-cell>Value</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">
                        <vscode-table-row>
                            <vscode-table-cell>Owner</vscode-table-cell>
                            <vscode-table-cell>${data.tdoc.owner}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Duration</vscode-table-cell>
                            <vscode-table-cell>${(new Date(data.tdoc.endAt).getTime() - new Date(data.tdoc.beginAt).getTime()) / 1000 / 60} minutes</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Rule</vscode-table-cell>
                            <vscode-table-cell>${contestRuleName[data.tdoc.rule]}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Begin At</vscode-table-cell>
                            <vscode-table-cell>${new Date(data.tdoc.beginAt).toLocaleString()}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>End At</vscode-table-cell>
                            <vscode-table-cell>${new Date(data.tdoc.endAt).toLocaleString()}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Attend</vscode-table-cell>
                            <vscode-table-cell>${data.tdoc.attend} people</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Rated</vscode-table-cell>
                            <vscode-table-cell>${data.tdoc.rated ? 'Yes' : 'No'}</vscode-table-cell>
                        </vscode-table-row>
                        <vscode-table-row>
                            <vscode-table-cell>Allow View Code</vscode-table-cell>
                            <vscode-table-cell>${data.tdoc.allowViewCode ? 'Yes' : 'No'}</vscode-table-cell>
                        </vscode-table-row>
                    </vscode-table-body>
                </vscode-table>
                <vscode-divider></vscode-divider>
                ${data.tdoc.content}`;

                var scoreboardHTML = `<vscode-table zebra bordered-rows resizable>
                    <vscode-table-header slot="header">`;
                var isFirst = true;
                for (const row of data.rows) {
                    if (isFirst) {
                        isFirst = false;
                        for (const cell of row) {
                            switch (cell.type) {
                                case 'rank':
                                    scoreboardHTML += `<vscode-table-header-cell>${cell.value}</vscode-table-header-cell>`;
                                    break;
                                case 'user':
                                    scoreboardHTML += `<vscode-table-header-cell>${cell.value}</vscode-table-header-cell>`;
                                    break;
                                case 'total_score':
                                    scoreboardHTML += `<vscode-table-header-cell>${cell.value}</vscode-table-header-cell>`;
                                    break;
                                case 'problem':
                                    scoreboardHTML += `<vscode-table-header-cell>
                                        <span onclick="vscode.postMessage({command:'openProblem',pid:'${cell.raw}'})" style="cursor: pointer;">
                                            ${cell.value} ${data.pdict[cell.raw].title} ${data.pdict[cell.raw].nAccept}/${data.pdict[cell.raw].nSubmit}
                                        </span>
                                    </vscode-table-header-cell>`;
                                    break;
                                default:
                                    break;
                            }
                        }
                        scoreboardHTML += `</vscode-table-header><vscode-table-body slot="body">`;
                        continue;
                    }
                    scoreboardHTML += `<vscode-table-row>`;
                    for (const cell of row) {
                        switch (cell.type) {
                            case 'rank':
                                scoreboardHTML += `<vscode-table-cell>${cell.value}</vscode-table-cell>`;
                                break;
                            case 'user':
                                scoreboardHTML += `<vscode-table-cell>${cell.value}</vscode-table-cell>`;
                                break;
                            case 'total_score':
                                scoreboardHTML += `<vscode-table-cell>${cell.value}</vscode-table-cell>`;
                                break;
                            case 'problem':
                                scoreboardHTML += `<vscode-table-cell>${cell.value}</vscode-table-cell>`;
                                break;
                            case 'record':
                                if (cell.raw === null) {
                                    scoreboardHTML += `<vscode-table-cell>-</vscode-table-cell>`;
                                }
                                else {
                                    scoreboardHTML += `<vscode-table-cell style="${cell.style ? 'background-color: rgb(217, 240, 199)' : ''}">
                                        <span style="cursor: pointer; color: ${scoreColor[Math.floor(cell.value / 100 * 10)]}" onclick="vscode.postMessage({command:'openRecord',rid:'${cell.raw}'})">${cell.value}</span>
                                    </vscode-table-cell>`;
                                }
                                break;
                            case 'records':
                                scoreboardHTML += `<vscode-table-cell>`;
                                for (const record of cell.raw) {
                                    if (record.value === "-") {
                                        scoreboardHTML += `<span>-</span>`;
                                    }
                                    else {
                                        scoreboardHTML += `<span style="cursor: pointer; color: ${scoreColor[Math.floor(record.value / 100 * 10)]}" onclick="vscode.postMessage({command:'openRecord',rid:'${record.raw}'})">${record.value}</span>`;
                                    }
                                    scoreboardHTML += " / ";
                                }
                                scoreboardHTML = scoreboardHTML.slice(0, -3);
                                scoreboardHTML += `</vscode-table-cell>`;
                                break;
                            default:
                                break;
                        }
                    }
                    scoreboardHTML += `</vscode-table-row>`;
                }
                scoreboardHTML += `</vscode-table-body></vscode-table>`;
                scoreboard.innerHTML = scoreboardHTML;
                break;
            default:
                break;
        }
    });
});
