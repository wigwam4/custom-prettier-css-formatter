const vscode = require('vscode');
const jsoncParser = require('jsonc-parser');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let isApplyingEdit = false; // 편집 적용 중인지 추적하는 플래그

    let disposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (document.languageId !== 'css' || isApplyingEdit) {
            return;
        }
        
        const settingFilePath = vscode.Uri.joinPath(context.extensionUri, 'settings.jsonc');
        const settingData = await vscode.workspace.fs.readFile(settingFilePath);
        const settingDataAsString = Buffer.from(settingData).toString('utf8');
        const settings = jsoncParser.parse(settingDataAsString);

        let content = document.getText();
        let newContent = applyStyleOrder(content, settings);

        if (content !== newContent) {
            isApplyingEdit = true; // 편집 적용 시작
            try {
                let workspaceEdit = new vscode.WorkspaceEdit();
                let fullDocumentRange = new vscode.Range(
                    document.lineAt(0).range.start,
                    document.lineAt(document.lineCount - 1).range.end
                );
                workspaceEdit.replace(document.uri, fullDocumentRange, newContent);
                await vscode.workspace.applyEdit(workspaceEdit);
                await document.save(); // 변경사항을 문서에 저장
            } catch (error) {
                vscode.window.showErrorMessage('스타일 순서 변경 중 오류가 발생했습니다: ' + error.message);
            } finally {
                isApplyingEdit = false; // 편집 적용 완료
            }
        }
    });

    context.subscriptions.push(disposable);
}

function applyStyleOrder(content, setting) {
    const styleRegex = /([^{}]+){([^}]+)}/g;
    const modifiedContent = content.replace(styleRegex, (match, selector, styles) => {
        const lines = styles.trim().split(';').map(line => line.trim()).filter(line => line.length > 0);
        let orderedLines = [];
        let additionalStyles = [];
        let result;

        setting.cssPrettierFormat.forEach(style => {
            if (style === '\n') {
                if (orderedLines.length === 0 || orderedLines[orderedLines.length - 1] !== '') {
                    orderedLines.push('');
                }
            } else {
                const index = lines.findIndex(line => line.split(':')[0].trim() === style);
                if (index !== -1) {
                    orderedLines.push(lines.splice(index, 1)[0]);
                }
            }
        });

        lines.forEach(line => {
            if (!setting.cssPrettierFormat.some(style => new RegExp(style + ':').test(line))) {
                additionalStyles.push(line);
                additionalStyles.push(''); // 이 부분을 조정하거나 제거할 수 있습니다.
            }
        });

        orderedLines.push(...additionalStyles);

        // 불필요한 줄바꿈 제거
        if (orderedLines[0] === '') orderedLines.shift();
        if (orderedLines[orderedLines.length - 1] === '') orderedLines.pop();

        const formatStyleOrder = {
            single: formatSingleStyleOrder,
            multi: formatMultiStyleOrder,
            mixed: formatMixedStyleOrder
        };

        result = (formatStyleOrder[setting.cssPrettierType] || formatStyleOrder.multi)(orderedLines, selector);

        return result;
    });

    // 마지막 줄바꿈 제거
    return modifiedContent.trimEnd() + '\n'; // 전체 내용의 끝에 하나의 줄바꿈만 유지
}

function formatSingleStyleOrder(orderedLines, selector) {
    let formattedStyles = orderedLines.filter(line => line !== '').map(line => {
        const [key, value] = line.split(':');
        return `${key.trim()}: ${value.trim()};`;
    }).join(' ');

    return `${selector.trim()} { ${formattedStyles} }\n`;
}

function formatMultiStyleOrder(orderedLines, selector) {
    let formattedStyles = orderedLines.filter(line => line !== '').map(line => `  ${line.trim()};`).join('\n');

    return `${selector.trim()} {\n${formattedStyles}\n}\n`;
}

function formatMixedStyleOrder(orderedLines, selector) {
    let formattedStyles = orderedLines.map((line, index) => {
        if (line === '') {
            return `\n\t`;
        } else {
            const [ key, value ] = line.split(':');
            if (index === 0) { // 첫번째 줄 텝 공백 추가
                return `\t${key.trim()}: ${value.trim()}; `;
            } else {
                return `${key.trim()}: ${value.trim()}; `;
            }
        }
    }).join('');

    return `${selector.trim()} {\n${formattedStyles}\n}\n`;
}

module.exports = {
    activate
}