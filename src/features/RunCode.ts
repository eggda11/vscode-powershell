// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from "path";
import vscode = require("vscode");
import { SessionManager } from "../session";
import Settings = require("../settings");
import utils = require("../utils");

enum LaunchType {
    Debug,
    Run,
}

export class RunCodeFeature implements vscode.Disposable {

    private command: vscode.Disposable;

    constructor(private sessionManager: SessionManager) {
        this.command = vscode.commands.registerCommand(
            "PowerShell.RunCode",
            (runInDebugger: boolean, scriptToRun: string, args: string[]) => {
                this.launchTask(runInDebugger, scriptToRun, args);
            });
    }

    public dispose() {
        this.command.dispose();
    }

    private async launchTask(
        runInDebugger: boolean,
        scriptToRun: string,
        args: string[]) {

        const launchType = runInDebugger ? LaunchType.Debug : LaunchType.Run;
        const launchConfig = await createLaunchConfig(launchType, scriptToRun, args);
        return this.launch(launchConfig);
    }

    private async launch(launchConfig: string | vscode.DebugConfiguration) {
        // Create or show the interactive console
        // TODO #367: Check if "newSession" mode is configured
        vscode.commands.executeCommand("PowerShell.ShowSessionConsole", true);

        // Write out temporary debug session file
        utils.writeSessionFile(
            utils.getDebugSessionFilePath(),
            this.sessionManager.getSessionDetails());

        vscode.debug.startDebugging(await vscode.window.showWorkspaceFolderPick(), launchConfig);
    }
}

async function createLaunchConfig(launchType: LaunchType, commandToRun: string, args: string[]) {
    const settings = Settings.load();

    let cwd: string;
    if (vscode.window.activeTextEditor
        && vscode.window.activeTextEditor.document
        && !vscode.window.activeTextEditor.document.isUntitled) {
        cwd = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)?.uri.fsPath;
    }
    if (cwd === undefined) {
        if (vscode.workspace.workspaceFolders?.length > 1) {
            cwd = (await vscode.window.showWorkspaceFolderPick())?.uri.fsPath;
        } else {
            cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        }
    }

    const launchConfig = {
        request: "launch",
        type: "PowerShell",
        name: "PowerShell Run Code",
        internalConsoleOptions: "neverOpen",
        noDebug: (launchType === LaunchType.Run),
        createTemporaryIntegratedConsole: settings.debugging.createTemporaryIntegratedConsole,
        script: commandToRun,
        args,
        cwd,
    };

    return launchConfig;
}
