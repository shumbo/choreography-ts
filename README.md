# choreography-ts

Choreographic Programming in TypeScript

## Development

### Requirements

You will need [Node.js](https://nodejs.org/en) (v18+) and [pnpm](https://pnpm.io/) installed.

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