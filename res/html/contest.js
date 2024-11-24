window.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');

    content.innerHTML = `<h1 id="title"></h1>
<vscode-button disabled icon="refresh" id="refresh">Refresh</vscode-button>
<vscode-tabs selected-index="1">
    <vscode-tab-header slot="header" id="infoTab">Info</vscode-tab-header><vscode-tab-panel><p id="info"></p></vscode-tab-panel>
    <vscode-tab-header slot="header" id="scoreboardTab">Scoreboard</vscode-tab-header><vscode-tab-panel><p id="scoreboard"></p></vscode-tab-panel>
</vscode-tabs>`;

    const title = document.getElementById('title');
    const refresh = document.getElementById('refresh');
    const infoTab = document.getElementById('infoTab');
    const info = document.getElementById('info');
    const scoreboardTab = document.getElementById('scoreboardTab');
    const scoreboard = document.getElementById('scoreboard');

    window.onmessage = (event) => {
        loading.style.display = 'none';
        content.style.display = '';
        const message = event.data;
        const data = message.data;
        switch (message.command) {
            case 'info':
                infoTab.style.display = 'unset';

                title.innerHTML = `${data.tdoc.title}`;

                refresh.onclick = () => {
                    vscode.postMessage({ command: 'refresh' });
                    loading.style.display = 'flex';
                    content.style.display = 'none';
                };
                refresh.disabled = false;

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
                            <vscode-table-cell>${toTime(new Date(data.tdoc.endAt).getTime() - new Date(data.tdoc.beginAt).getTime())}</vscode-table-cell>
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
                ${parseMarkdown(data.tdoc.content)}`;
                renderPdf();
                break;
            case 'scoreboard':
                scoreboardTab.style.display = 'unset';

                var scoreboardHTML = `<vscode-table zebra bordered-rows resizable>
                    <vscode-table-header slot="header">`;
                var isFirst = true;
                for (const row of data.rows) {
                    if (!isFirst) {
                        scoreboardHTML += `<vscode-table-row>`;
                    }
                    for (const cell of row) {
                        const elementName = `vscode-table-${isFirst ? 'header-' : ''}cell`;
                        switch (cell.type) {
                            case 'problem':
                                scoreboardHTML += `<${elementName}>
                                        <span onclick="vscode.postMessage({command:'openP',data:['${cell.raw}','${data.tdoc._id}']})" style="cursor: pointer;">
                                            ${cell.value} ${data.pdict[cell.raw].title} ${data.pdict[cell.raw].nAccept}/${data.pdict[cell.raw].nSubmit}
                                        </span>
                                    </${elementName}>`;
                                break;
                            case 'record':
                                if (cell.raw === null) {
                                    scoreboardHTML += `<${elementName}>-</${elementName}>`;
                                }
                                else {
                                    scoreboardHTML += `<${elementName} style="${cell.style ? 'background-color: rgb(217, 240, 199)' : ''}">
                                        <span style="cursor: pointer; color: ${scoreColor[Math.floor(cell.score / 100 * 10)]}" onclick="vscode.postMessage({command:'openT',data:['${cell.raw}']})">${cell.value}</span>
                                    </${elementName}>`;
                                }
                                break;
                            case 'records':
                                scoreboardHTML += `<${elementName}>`;
                                for (const record of cell.raw) {
                                    if (record.value === "-") {
                                        scoreboardHTML += `<span>-</span>`;
                                    }
                                    else {
                                        scoreboardHTML += `<span style="cursor: pointer; color: ${scoreColor[Math.floor(record.value / 100 * 10)]}" onclick="vscode.postMessage({command:'openT',data:['${record.raw}']})">${record.value}</span>`;
                                    }
                                    scoreboardHTML += " / ";
                                }
                                scoreboardHTML = scoreboardHTML.slice(0, -3);
                                scoreboardHTML += `</${elementName}>`;
                                break;
                            default:
                                scoreboardHTML += `<${elementName}>${cell.value ?? 'Unknown'}</${elementName}>`;
                                break;
                        }
                    }
                    if (isFirst) {
                        isFirst = false;
                        scoreboardHTML += `</vscode-table-header><vscode-table-body slot="body">`;
                        continue;
                    } else {
                        scoreboardHTML += `</vscode-table-row>`;
                    }
                }
                scoreboardHTML += `</vscode-table-body></vscode-table>`;
                scoreboard.innerHTML = scoreboardHTML;
                break;
            default:
                break;
        }
    };
});
