# choreography-ts

![GitHub Actions](https://github.com/shumbo/choreography-ts/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/shumbo/choreography-ts/branch/main/graph/badge.svg?token=iUj1DlhbpJ)](https://codecov.io/gh/shumbo/choreography-ts)

Choreographic Programming in TypeScript

## Repository Structure

This repository is a monorepo managed with [pnpm workspace](https://pnpm.io/workspaces). It contains the following packages:

- [`@choreography-ts/core`](./packages/core): Core library for choreographic programming.
- [`@choreography-ts/eslint-plugin-choreography-ts`](./packages/eslint-plugin-choreography-ts): ESLint plugin for choreography-ts.
- [`@choreography-ts/examples`](./packages/examples): Example projects demonstrating the usage of choreography-ts.
- [`@choreography-ts/transport-express`](./packages/transport-express): Express (HTTP) transport layer for choreography-ts.
- [`@choreography-ts/transport-socketio`](./packages/transport-socketio): Socket.IO transport layer for choreography-ts.

## Development

### Requirements

You will need [Node.js](https://nodejs.org/en) (v18+) and [pnpm](https://pnpm.io/) (v8) installed.

### Setup

This repository is a monorepo managed with [pnpm workspace](https://pnpm.io/workspaces).

To install dependencies, run:

```sh
pnpm install
```

### Building & Testing

We use [turborepo](https://turbo.build/repo) as a build system. To build all packages, run:

```sh
pnpm build
```

at the root of the repository. Similarly, to run all tests, run:

```sh
pnpm test
```

### Linting & Formatting

We use [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) to lint and format our code. To lint all packages, run:

```sh
pnpm check
```
