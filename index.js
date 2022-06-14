"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileStatus = exports.fileProofMerkleRoot = exports.defaultStamp = void 0;
const { MerkleTree } = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');
// Our default function for stamping a file's inclusion in the network.
const defaultStamp = (cid, timestamp) => {
    return SHA256(cid, timestamp).toString();
};
exports.defaultStamp = defaultStamp;
const fileProofMerkleRoot = (timestamp, ipfsNode, CIDs, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    // Initialize our return Object
    let returnObject = {
        root: '',
        timestamp: timestamp,
        stampFunction: options.stampFunction || exports.defaultStamp
    };
    // Create a new merkle tree
    let leaves = [];
    // For each CID, generate a proof of inclusion
    for (let i = 0; i < CIDs.length; i++) {
        // Get the proof of inclusion, returns a boolean if the file is found
        let proof = yield fileProof(ipfsNode, CIDs[i]);
        // If the proof is valid, stamp it and add it to the list of leaves
        if (proof) {
            let leaf = {
                cid: CIDs[i],
                stamp: returnObject.stampFunction(CIDs[i], timestamp)
            };
            leaves.push(leaf);
        }
    }
    // Create a new merkle tree based
    const tree = new MerkleTree(leaves, SHA256, { hashLeaves: true });
    const root = tree.getRoot().toString('hex');
    console.debug('[IPFS Verifier] Generated merkle root: ', root);
    // If we have a callback, call it with the proofs of each leaf
    if (options.proofCallback) {
        // For each leaf,
        for (let i = 0; i < leaves.length; i++) {
            // Hash it and get its proof
            // https://github.com/miguelmota/merkletreejs/blob/master/docs/classes/_src_merkletree_.merkletree.md#getproof
            let proof = tree.getProof(SHA256(leaves[i]));
            console.debug('[IPFS Verifier] Proof of inclusion for leaf ', leaves[i], ": ", proof);
            // Call the callback with the proof object
            options.proofCallback(leaves[i].cid, proof);
        }
    }
    return root;
});
exports.fileProofMerkleRoot = fileProofMerkleRoot;
// Verify a file's inclusion in the network the file's metadata (CID, Proof) and our Merkle Root returned by the
// IPFS Verifier
const fileStatus = (CID, proof, merkleRoot) => __awaiter(void 0, void 0, void 0, function* () {
    // Calculate the leaf of the file based on the CID and the timestamp
    let leaf = {
        cid: CID,
        stamp: merkleRoot.stampFunction(CID, merkleRoot.timestamp)
    };
    // TODO: Figure out if this works without having to recreate the merkle tree
    let tree = new MerkleTree([], SHA256, { hashLeaves: true });
    // Verify the proof of inclusion using the Merkle Tree
    return tree.verify(proof, leaf, merkleRoot.root);
});
exports.fileStatus = fileStatus;
//TODO: Implement checking file status using Merkle Proofs
// Prove the storage of a file on the IPFS network based on it's CID
const fileProof = (ipfsNode, CID) => __awaiter(void 0, void 0, void 0, function* () {
    // Get a challenge block from the IPFS node
    // let challengeBlock = await getChallengeBlock(ipfsNode, CID)
    // Check if the challenge block is valid against our maintained Merkle Tree
    // let root = tree.getRoot().toString('hex')
    // let leaf = SHA256(challengeBlock.data).toString()
    // let proof = tree.getProof(leaf)
    // return tree.verify(proof, leaf, tree.root)
    const fileStatus = yield ipfsNode.files.stat(CID);
    return fileStatus.cid.toString() === CID;
});
// Generate a deterministic block index from a file using a Hash of the file's CID and a timestamp
const getChallengeBlock = (ipfsNode, CID) => __awaiter(void 0, void 0, void 0, function* () {
    // Get all the block IDs for the file
    const links = yield ipfsNode.object.links(CID);
    const hashes = links.map((link) => link.Hash.toString());
    // Get a deterministic block index based on the hash of the file and the current time
    let index = SHA256(CID, Date.now()) % hashes.length;
    let block_cid = hashes[index];
    // Return the contents of the block
    return yield ipfsNode.cat(block_cid);
});
