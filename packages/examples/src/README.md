# Examples

This folder contains example implementations of choreographic programs. To build them, run `tsc` in this folder to generate the `dist` build directory. Then invoke `node dist/<example folder>/<example>.js` to see the output for the specified example (e.g. `node dist/diffie-hellman/diffie-hellman.js alice`). You can also invoke `pnpm test` to test everything at once using the Jest framework, which will run the `<example>.test.ts` unit test files.
