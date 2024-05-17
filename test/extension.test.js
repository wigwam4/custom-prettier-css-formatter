const assert = require('assert');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
// const myExtension = require('../extension');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Format CSS file using Prettier', async () => {
        const cssFilePath = path.join(__dirname, '..', 'test', 'test.css');
        const uri = vscode.Uri.file(cssFilePath);
        
        // Open the CSS file in VS Code
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        // Apply formatting using Prettier
        await vscode.commands.executeCommand('editor.action.formatDocument');

        // Read the formatted content
        const formattedContent = fs.readFileSync(cssFilePath, 'utf-8');

        // Assert that the formatted content is not empty
        assert.strictEqual(formattedContent.length > 0, true, 'Formatted CSS file is not empty.');
    });
});
