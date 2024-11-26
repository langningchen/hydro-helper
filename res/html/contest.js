window.addEventListener('DOMContentLoaded', () => {
    registerTab('Info');
    registerTab('Scoreboard');

    window.onmessage = (event) => {
        const message = event.data;
        const data = message.data;
        switch (message.command) {
            case 'info':
                setTitle(data.tdoc.title);
                enableTab('Info', `<vscode-table zebra bordered-columns responsive resizable breakpoint="400" columns='["50%", "50%"]'>
                    <vscode-table-header slot="header">
                        <vscode-table-header-cell>Name</vscode-table-header-cell>
                        <vscode-table-header-cell>Value</vscode-table-header-cell>
                    </vscode-table-header>
                    <vscode-table-body slot="body">
                        <vscode-table-row>
                            <vscode-table-cell>Owner</vscode-table-cell>
                            <vscode-table-cell>${data.udict[data.tdoc.owner].uname}</vscode-table-cell>
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
                ${parseMarkdown(data.tdoc.content)}`);
                break;
            case 'scoreboard':
                var scoreboardHTML = `<vscode-table zebra bordered-columns responsive resizable breakpoint="400">
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
                                        <span role="button" onclick="vscode.postMessage({command:'openP',data:['${cell.raw}','${data.tdoc._id}']})">
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
                                        scoreboardHTML += `<span role="button" style="color: ${scoreColor[Math.floor(record.value / 100 * 10)]}" onclick="vscode.postMessage({command:'openT',data:['${record.raw}']})">${record.value}</span>`;
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
                enableTab('Scoreboard', scoreboardHTML);
                focusTab('Scoreboard');
                break;
            default:
                break;
        }
    };
});
