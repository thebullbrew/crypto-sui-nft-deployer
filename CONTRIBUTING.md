# Contributing

Thanks for your interest in improving the Sui NFT Deployer.

## Workflow

1. Fork the repo and create a branch from `main`.
2. Test every change against **testnet** before opening a PR.
3. Move changes: run `sui move build` inside `move/collection` and, for
   behavior changes, `sui move test` if tests are added.
4. Keep scripts idempotent where possible — a failed publish should be safely re-runnable.
5. Update the README if you change CLI behavior or env variables.

## Standards

- TypeScript, strict mode, no `any` without justification.
- Move code follows the [Sui Move style conventions](https://docs.sui.io/concepts/sui-move-concepts).
- No secrets in code, logs, or committed files. Ever.
- One concern per script: `publish.ts` and `mint.ts` stay focused.

## Security

If you find a vulnerability (especially around key handling), please open an issue rather than a PR so it can be handled carefully.
