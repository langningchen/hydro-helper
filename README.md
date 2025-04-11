# Hydro Helper

(**UNOFFICIAL**) Hydro Helper is a VSCode extension to solve [Hydro](https://github.com/hydro-dev/Hydro) problems easier.
> [!WARNING]  
> This extension is still under development, and may have breaking changes without any notice.

## Features

This extension provides the following features:

- Problem
  - Submit problem
  - Fetch statement
- Record
  - View record
  - Real-time refresh
- Contest / Homework
  - View scoreboard
  - Submit problem
  - Fetch statement

All the features are available in the VS Code sidebar.

## Requirements

Users using this extension should have [an Hydro account](https://hydro.ac).

## Key Bindings

- `Ctrl+Alt+Shift+P`: Open problem
- `Ctrl+Alt+Shift+S`: Submit problem

## Extension Settings

This extension contributes the following settings:

- `hydro.server.server`: The server address of Hydro, without protocol. Default is `hydro.ac`.
- `hydro.server.safeProtocol`: Whether to use safe protocol (HTTPS/WSS). Default is `true`.
- `hydro.server.domain`: The Hydro domain of Hydro. Default is `system`.
- `hydro.userInterface.webviewColumn`: Determines the display position of the webview.
- `hydro.attributes.loadAttributes`: Whether to load attributes of problems from the source file
- `hydro.attributes.saveAttributes`: Whether to save attributes of problems to the source file
- `hydro.problems.cphFilename`: The filename of the CPH file. You can use the following variables:
  - `${_id}`: The raw ID of the problem (e.g. `66c739de21385536a27470b0`)
  - `${owner}`: The owner of the problem (e.g. `1`)
  - `${ownerUname}`: The username of the owner (e.g. `langningchen`)
  - `${domainId}`: The domain ID of the problem (e.g. `system`)
  - `${docId}`: The document ID of the problem (e.g. `1`)
  - `${title}`: The title of the problem (e.g. `A+B Problem`)
  - `${nSubmit}`: The number of submissions of the problem (e.g. `111`)
  - `${nAccept}`: The number of accepted submissions of the problem (e.g. `48`)
  - `${memoryMin}`: The minimum memory limit of the problem (e.g. `64`)
  - `${memoryMax}`: The maximum memory limit of the problem (e.g. `64`)
  - `${timeMin}`: The minimum time limit of the problem (e.g. `1000`)
  - `${timeMax}`: The maximum time limit of the problem (e.g. `1000`)
  - `${type}`: The type of the problem (e.g. `default`)

## License

This project is licensed under the terms of the [GNU Affero General Public License v3.0](https://github.com/langningchen/hydro-helper/blob/main/LICENSE) and is not affiliated with Hydro or any other organization. The icon of this extension is copyrighted by [Hydro](https://hydro.js.org).

## Acknowledgements

This project is inspired by [vscode-luogu](https://github.com/himself65/vscode-luogu) and [the empty official vscode extension](https://github.com/hydro-dev/HydroVscode).

## Known Issues

See [GitHub Issues](https://github.com/langningchen/hydro-helper/issues).

## Change Log

See [CHANGELOG.md](https://github.com/langningchen/hydro-helper/blob/main/CHANGELOG.md)
