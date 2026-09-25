# Sui NFT Deployer

![banner](assets/banner.jpg)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Sui](https://img.shields.io/badge/Sui-Testnet%20%7C%20Mainnet-6FBCF0.svg)](https://sui.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org)

A professional, script-driven toolkit for deploying NFT collections to Sui — a Move package with on-chain supply caps, plus TypeScript scripts to publish it and mint. Built on the [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript) (`@mysten/sui`).

## Sui object-model primer

Sui does NFTs differently from account-based chains, and it's worth understanding before you deploy:

- **An NFT is an object, not a ledger entry.** Each `Nft` is its own on-chain object with a unique ID. Owning the object *is* owning the NFT — transferring the object transfers the NFT. There is no token account or global registry to query.
- **Owned vs. shared objects.** Your NFTs are *owned objects* (cheap, parallel, transferable with a simple transaction). The `Collection` registry in this repo is a *shared object* so every mint can read and bump the supply counter.
- **Capabilities, not allow-lists.** Admin rights are objects too: whoever holds the `CollectionCap` can mint. Lose the cap, lose control — store it in a cold wallet for production drops.
- **Display metadata is on-chain.** The `Display<Nft>` object tells wallets and explorers how to render your NFT (name, image, attributes). It's set up once at publish time in `init`.

## Features

- **Move package** — `Nft` object (name, description, URL, attributes), `Collection` supply registry, `CollectionCap` admin capability, supply-capped `mint`
- **Publish script** — publishes the package and creates the shared collection in one run
- **Mint script** — mints an NFT straight to any recipient address
- **Testnet-first workflow** — default network is testnet; mainnet requires an explicit opt-in
- **CI** — GitHub Actions checks TypeScript compilation on every push (Move builds run locally via the Sui CLI)

## Prerequisites

- Node.js 18+
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) (for `sui move build`)
- A Sui keypair with testnet SUI (faucet: https://faucet.sui.io, or `sui client faucet`)

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env: set SUI_PRIVATE_KEY (suiprivkey1... from `sui keytool export`)

# 3. Compile the Move package
cd move/collection && sui move build && cd ../..

# 4. Publish the package + create the collection (testnet first!)
npm run publish
# Save the printed PACKAGE_ID, COLLECTION_ID, COLLECTION_CAP_ID into .env

# 5. Mint
npm run mint
```

> ⚠️ **Always test on testnet first.** `SUI_NETWORK` defaults to `testnet`. Only set it to `mainnet` for the real launch, with a funded, dedicated deployer key.

## Project structure

```
├── move/collection/
│   ├── Move.toml            # Package manifest (Sui framework dependency)
│   └── sources/nft.move     # Nft object, Collection registry, CollectionCap, mint
├── src/
│   ├── config.ts            # SuiClient, keypair, and collection/mint settings
│   ├── publish.ts           # Publish package + create shared Collection
│   └── mint.ts              # Mint one NFT to a recipient
├── .env.example             # Required environment variables
└── .github/workflows/ci.yml
```

## Usage

### 1. Publish

```bash
npm run publish
```

Publishes the Move package, transfers the `UpgradeCap` to your address, then calls `create_collection` to create the shared supply registry. Prints the three IDs to save in `.env`.

### 2. Mint

```bash
npm run mint
```

Calls the on-chain `mint` function: checks the supply cap, creates the `Nft` object, and transfers it to `MINT_RECIPIENT` (or your own address).

## Configuration

| Variable | Description |
|---|---|
| `SUI_NETWORK` | `testnet` (default), `devnet`, or `mainnet` |
| `SUI_RPC_URL` | Optional RPC override; defaults to the public fullnode for the network |
| `SUI_PRIVATE_KEY` | Bech32 private key (`suiprivkey1...`) of the deployer |
| `PACKAGE_ID` | Move package ID after publishing |
| `COLLECTION_ID` | Shared Collection object ID |
| `COLLECTION_CAP_ID` | Admin capability object ID |
| `COLLECTION_NAME` / `COLLECTION_SYMBOL` | Collection display info |
| `MAX_SUPPLY` | Hard supply cap enforced on-chain |
| `NFT_NAME` / `NFT_DESCRIPTION` / `NFT_URL` | Per-mint metadata |
| `NFT_ATTRIBUTES_JSON` | JSON attribute map stored on the NFT object |
| `MINT_RECIPIENT` | Recipient address (defaults to deployer) |

## Security

- **Never commit `.env`** — it holds your private key. Use a dedicated deployer key, never your main wallet.
- The `CollectionCap` is full admin power: whoever holds it can mint. Move it to cold storage after the drop.
- Review `max_supply` on testnet before mainnet — the cap is immutable once the collection is created.
- `url::new_unsafe_from_bytes` aborts on invalid URLs; validate `NFT_URL` before minting.

## Roadmap

- [ ] Allow-listed mint via a second capability object
- [ ] `sui move test` unit tests for the supply cap
- [ ] Batch minting script
- [ ] Walrus integration for decentralized image storage

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
