/**
 * Mints one NFT from the deployed collection to a recipient address.
 * Requires PACKAGE_ID, COLLECTION_ID and COLLECTION_CAP_ID in .env
 * (printed by `npm run publish`).
 *
 * Run: npm run mint
 */
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { loadClient, loadKeypair, config, network } from "./config";

async function main() {
  if (!config.packageId || !config.collectionId || !config.collectionCapId) {
    throw new Error(
      "Set PACKAGE_ID, COLLECTION_ID and COLLECTION_CAP_ID in .env (run npm run publish first)."
    );
  }
  const client = loadClient();
  const keypair = loadKeypair();
  const recipient = config.mintRecipient ?? keypair.toSuiAddress();
  console.log(`Network: ${network} | Recipient: ${recipient}`);

  const urlBytes = new TextEncoder().encode(config.nftUrl);

  const tx = new Transaction();
  tx.moveCall({
    target: `${config.packageId}::nft::mint`,
    arguments: [
      tx.object(config.collectionCapId), // &CollectionCap (admin)
      tx.object(config.collectionId), // &mut Collection (shared)
      tx.pure.string(config.nftName),
      tx.pure.string(config.nftDescription),
      // vector<u8> argument: BCS-encode the URL bytes
      tx.pure(bcs.vector(bcs.u8()).serialize(urlBytes)),
      tx.pure.string(config.nftAttributesJson),
      tx.pure.address(recipient),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true, showEffects: true },
  });
  if (result.effects?.status.status !== "success") {
    throw new Error(`Mint failed: ${JSON.stringify(result.effects?.status)}`);
  }

  const nftChange = result.objectChanges?.find(
    (c) =>
      c.type === "created" &&
      ((c as { objectType?: string }).objectType as string)?.endsWith("::nft::Nft")
  );
  const nftId = (nftChange as { objectId?: string } | undefined)?.objectId;

  console.log(`Minted NFT: ${nftId ?? "(id not found in object changes)"}`);
  console.log(`Digest:     ${result.digest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
