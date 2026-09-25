import "dotenv/config";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

export type SuiNetwork = "mainnet" | "testnet" | "devnet";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Target network. Defaults to testnet — never mainnet by accident. */
export const network: SuiNetwork =
  (process.env.SUI_NETWORK as SuiNetwork) || "testnet";

/**
 * RPC client. Uses SUI_RPC_URL when set, otherwise the public fullnode
 * for the configured network.
 */
export function loadClient(): SuiClient {
  const url = process.env.SUI_RPC_URL || getFullnodeUrl(network);
  return new SuiClient({ url });
}

/**
 * Signer keypair.
 * SUI_PRIVATE_KEY must be the bech32-encoded private key (`suiprivkey1...`)
 * exported via `sui keytool export --key-identity <alias>`.
 * Use a DEDICATED deployer key, never your main wallet.
 */
export function loadKeypair(): Ed25519Keypair {
  const { secretKey } = decodeSuiPrivateKey(required("SUI_PRIVATE_KEY"));
  return Ed25519Keypair.fromSecretKey(secretKey);
}

export const config = {
  // Filled in after running `npm run publish`
  packageId: process.env.PACKAGE_ID,
  collectionId: process.env.COLLECTION_ID,
  collectionCapId: process.env.COLLECTION_CAP_ID,

  // Collection settings (used by `npm run publish`)
  collectionName: process.env.COLLECTION_NAME ?? "My Collection",
  collectionSymbol: process.env.COLLECTION_SYMBOL ?? "MYC",
  maxSupply: Number(process.env.MAX_SUPPLY ?? "1000"),

  // Mint settings (used by `npm run mint`)
  nftName: process.env.NFT_NAME ?? "My NFT #1",
  nftDescription:
    process.env.NFT_DESCRIPTION ?? "A professional NFT minted on Sui.",
  nftUrl: process.env.NFT_URL ?? "https://example.com/nft.png",
  nftAttributesJson: process.env.NFT_ATTRIBUTES_JSON ?? "{}",
  // Defaults to the signer address when empty
  mintRecipient: process.env.MINT_RECIPIENT,
};
