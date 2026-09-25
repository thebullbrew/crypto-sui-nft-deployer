/**
 * Publishes the Move package (`move/collection`) and creates the shared
 * Collection registry. Prints the IDs you must save into .env:
 *   PACKAGE_ID, COLLECTION_ID, COLLECTION_CAP_ID
 *
 * Prerequisites:
 *   1. Install the Sui CLI: https://docs.sui.io/guides/developer/getting-started/sui-install
 *   2. Compile the package:  cd move/collection && sui move build
 *      (bytecode lands in move/collection/build/nft_collection/bytecode_modules/)
 *   3. Fund the deployer address (testnet faucet: https://faucet.sui.io)
 *
 * Run: npm run publish
 */
import * as fs from "fs";
import * as path from "path";
import { Transaction } from "@mysten/sui/transactions";
import { loadClient, loadKeypair, config, network } from "./config";

// Well-known framework addresses — identical on mainnet, testnet, devnet.
const MOVE_STDLIB = "0x1";
const SUI_FRAMEWORK = "0x2";

function loadBytecode(): number[][] {
  const dir = path.join(
    __dirname,
    "..",
    "move",
    "collection",
    "build",
    "nft_collection",
    "bytecode_modules"
  );
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Compiled Move bytecode not found at ${dir}.\n` +
        "Build it first: cd move/collection && sui move build"
    );
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mv"));
  if (files.length === 0) {
    throw new Error(`No .mv modules found in ${dir}. Run: sui move build`);
  }
  return files.map((f) => Array.from(fs.readFileSync(path.join(dir, f))));
}

async function main() {
  const client = loadClient();
  const keypair = loadKeypair();
  const sender = keypair.toSuiAddress();
  console.log(`Network: ${network} | Deployer: ${sender}`);

  const modules = loadBytecode();
  console.log(`Publishing ${modules.length} module(s)...`);

  const tx = new Transaction();
  const [upgradeCap] = tx.publish({
    modules,
    dependencies: [MOVE_STDLIB, SUI_FRAMEWORK],
  });
  // The UpgradeCap is an owned object: keep it with the deployer.
  tx.transferObjects([upgradeCap], sender);

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true, showEffects: true },
  });
  if (result.effects?.status.status !== "success") {
    throw new Error(`Publish failed: ${JSON.stringify(result.effects?.status)}`);
  }

  const published = result.objectChanges?.find((c) => c.type === "published");
  const packageId = (published as { packageId?: string } | undefined)?.packageId;
  if (!packageId) throw new Error("Could not find published package ID.");

  const capChange = result.objectChanges?.find(
    (c) =>
      c.type === "created" &&
      typeof (c as { objectType?: string }).objectType === "string" &&
      ((c as { objectType?: string }).objectType as string).endsWith("::nft::CollectionCap")
  );
  const capId = (capChange as { objectId?: string } | undefined)?.objectId;
  if (!capId) throw new Error("Could not find the CollectionCap object.");

  console.log(`\nPackage published: ${packageId}`);
  console.log(`CollectionCap:     ${capId}`);

  // Create the shared Collection registry (enforces max supply on-chain).
  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${packageId}::nft::create_collection`,
    arguments: [
      tx2.object(capId),
      tx2.pure.string(config.collectionName),
      tx2.pure.string(config.collectionSymbol),
      tx2.pure.u64(config.maxSupply),
    ],
  });
  const result2 = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx2,
    options: { showObjectChanges: true, showEffects: true },
  });
  if (result2.effects?.status.status !== "success") {
    throw new Error(
      `create_collection failed: ${JSON.stringify(result2.effects?.status)}`
    );
  }
  const collectionChange = result2.objectChanges?.find(
    (c) =>
      c.type === "created" &&
      ((c as { objectType?: string }).objectType as string)?.endsWith("::nft::Collection")
  );
  const collectionId = (collectionChange as { objectId?: string } | undefined)?.objectId;
  if (!collectionId) throw new Error("Could not find the Collection object.");

  console.log(`Collection created: ${collectionId}`);
  console.log("\nSave these in .env:");
  console.log(`  PACKAGE_ID=${packageId}`);
  console.log(`  COLLECTION_ID=${collectionId}`);
  console.log(`  COLLECTION_CAP_ID=${capId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
