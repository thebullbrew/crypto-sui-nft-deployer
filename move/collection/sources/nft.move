/// Sui NFT collection module.
///
/// Design notes (Sui object model):
/// - Each NFT is its own **owned object** (`Nft`). There is no global token
///   registry and no "mint account" indirection like on account-based chains:
///   ownership *is* the object. Transferring the object transfers the NFT.
/// - `Collection` is a **shared object** that tracks `minted` / `max_supply`
///   so the supply cap is enforced on-chain, no matter who calls `mint`.
/// - `CollectionCap` is an **admin capability**: only its holder can create
///   collections and mint. Keep it in a cold wallet for production drops.
module nft_collection::nft;

use std::string::{Self, String};
use sui::display;
use sui::object::{Self, UID};
use sui::package;
use sui::transfer;
use sui::tx_context::TxContext;
use sui::url::{Self, Url};

// === Errors ===
const EMaxSupplyReached: u64 = 0;
const EZeroSupply: u64 = 1;

// === One-time witness ===
/// Marker type used once at publish time to claim the `Publisher` object.
public struct NFT has drop {}

// === Structs ===
/// A single NFT: an owned object with display metadata.
public struct Nft has key, store {
    id: UID,
    name: String,
    description: String,
    url: Url,
    /// JSON-encoded attribute map, e.g. `{"Background":"Forest","Eyes":"Amber"}`.
    attributes: String,
}

/// Admin capability. Whoever holds this can create collections and mint.
public struct CollectionCap has key, store {
    id: UID,
}

/// Shared registry for a collection: enforces the supply cap on-chain.
public struct Collection has key {
    id: UID,
    name: String,
    symbol: String,
    minted: u64,
    max_supply: u64,
}

// === Init ===
/// Runs once at publish. Sets up on-chain display metadata (what wallets and
/// explorers render) and issues the admin cap to the publisher.
fun init(otw: NFT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    let keys = vector[
        string::utf8(b"name"),
        string::utf8(b"description"),
        string::utf8(b"image_url"),
        string::utf8(b"attributes"),
    ];
    let values = vector[
        string::utf8(b"{name}"),
        string::utf8(b"{description}"),
        string::utf8(b"{url}"),
        string::utf8(b"{attributes}"),
    ];
    let mut display = display::new_with_fields<Nft>(&publisher, keys, values, ctx);
    display::update_version(&mut display);

    let sender = ctx.sender();
    transfer::public_transfer(publisher, sender);
    transfer::public_transfer(display, sender);
    transfer::transfer(CollectionCap { id: object::new(ctx) }, sender);
}

// === Public functions (called via programmable transaction blocks) ===
/// Create a shared `Collection` registry. Requires the admin cap.
public fun create_collection(
    _cap: &CollectionCap,
    name: String,
    symbol: String,
    max_supply: u64,
    ctx: &mut TxContext,
) {
    assert!(max_supply > 0, EZeroSupply);
    let collection = Collection {
        id: object::new(ctx),
        name,
        symbol,
        minted: 0,
        max_supply,
    };
    transfer::share_object(collection);
}

/// Mint one NFT. Aborts once `max_supply` is reached.
/// The new `Nft` object is transferred directly to `recipient`.
public fun mint(
    _cap: &CollectionCap,
    collection: &mut Collection,
    name: String,
    description: String,
    url_bytes: vector<u8>,
    attributes: String,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(collection.minted < collection.max_supply, EMaxSupplyReached);
    let nft = Nft {
        id: object::new(ctx),
        name,
        description,
        url: url::new_unsafe_from_bytes(url_bytes),
        attributes,
    };
    collection.minted = collection.minted + 1;
    transfer::transfer(nft, recipient);
}

// === Accessors ===
public fun collection_minted(collection: &Collection): u64 {
    collection.minted
}

public fun collection_max_supply(collection: &Collection): u64 {
    collection.max_supply
}
