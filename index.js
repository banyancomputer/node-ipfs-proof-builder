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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const { MerkleTree } = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');
const cliProgress = require('cli-progress');
/**
 * Summary: Generate a stamped merkle root for our network based on a list of CIDS.
 * @param timestamp: The timestamp we should use to stamp our leaves
 * @param ipfsNode:  The IPFS node we want to use in order to generate the root.
 * @param files:      The list of filesObjects we want to check.
 * @param options:  An object containing the following optional arguments:
 *        proofCallback: A callback that takes a fileProof object in as an argument. This can be used to store fileProofs
 *          in a database of your choice
 *        @deprecated stampCallback: A callback that takes a leaf and returns the stamp of the leaf. This can be
 *          supplied in order to generate a custom stamp for your leaves. This must return a hash in the string.
 * @returns TimestampedMerkleRoot The merkle root of the network. It is the caller's responsibility to provide a
    `proofCallback` should they want to store more information about the proofs.
 */
exports.fileProofMerkleRoot = (timestamp, ipfsNode, files, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    // Initialize our Merkle Tree
    let returnObject = {
        root: '',
        timestamp: timestamp,
    };
    // Declare an array to hold our leaves
    let leaves = [];
    // For each CID, generate a proof of inclusion
    console.log("Generating proofs...");
    const proofProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    proofProgressBar.start(files.length, 0);
    for (let i = 0; i < files.length; i++) {
        // Get the proof of inclusion, returns a boolean if the file is found
        let available = yield fileChallenge(ipfsNode, files[i].CID);
        // console.log(available ?
        //     ("File Reachable: " + files[i].CID) :
        //     ("File Unreachable: " + files[i].CID)
        // )
        // If the proof is valid, stamp it and add it to the list of leaves
        if (available) {
            let leaf = {
                CID: files[i].CID,
                timestamp: timestamp,
                // salt: files[i].salt
            };
            // Append a hash of the leaf to the list of leaves
            leaves.push(leaf);
        }
        proofProgressBar.update(i + 1);
    }
    proofProgressBar.stop();
    console.log("Generating Merkle Tree...");
    // Generate the Merkle Tree using our stamp function
    // For some reason you can't pass a list of object as an argument to MerkleTree(), so stringify first
    const tree = new MerkleTree(leaves.map(x => defaultStamp(x)), defaultStamp, { hashLeaves: false });
    // Extract our Root Hash of our Merkle Tree
    returnObject.root = tree.getRoot().toString('hex');
    // console.log(tree.toString())
    // If we have a callback for storing our proofs, call it on each leaf
    if (options.proofCallback) {
        console.log("Saving proofs...");
        proofProgressBar.start(files.length, 0);
        // For each hashed leaf,
        for (let i = 0; i < leaves.length; i++) {
            // Declare a new fileProof object
            let fp = {
                leaf: leaves[i],
                proof: tree.getProof(defaultStamp(leaves[i]))
            };
            // Call the callback on the fileProof
            options.proofCallback(fp);
            proofProgressBar.update(i + 1);
        }
        proofProgressBar.stop();
    }
    // Return our Merkle Tree
    console.log(returnObject);
    return returnObject;
});
/**
 * Summary: Verify a file's inclusion in a timestamped Merkle Tree
 * @param leaf: The leaf of the Merkle Tree we want to verify
 * @param proof: The proof of inclusion of the leaf
 * @param merkleRoot: The Timestamped Merkle Root of the network
 * @returns boolean: True if the file is available on the network, false otherwise
 */
exports.fileStatus = (leaf, proof, merkleRoot) => __awaiter(void 0, void 0, void 0, function* () {
    // Calculate the leaf of the file based on the CID and the timestamp
    // console.log("Testing inclusions of Leaf: ", fp.leaf)
    // Verify the proof of inclusion using the Merkle Tree Object
    console.log("Verifying inclusion of Leaf: ", leaf);
    console.log("With Proof: ", proof);
    return MerkleTree.verify(proof, defaultStamp(leaf), merkleRoot.root);
});
/* Helper Functions and Defaults */
/**
 * Summary: Default stamp function that stamps a leaf use SHA256
 * @param leaf: The leaf we want to stamp
 * @returns String: The stamp of the file
 */
const defaultStamp = (leaf) => {
    // check if the leaf is an object
    if (leaf instanceof Object) {
        leaf = JSON.stringify(leaf);
    }
    return SHA256(leaf).toString();
};
//TODO: Implement checking file status using Merkle Proofs
/**
 * Summary: Prove that a file is available on the network.
 * @param ipfsNode: The IPFS node we want to use to generate the proof.
 * @param CID: The CID of the file we want to check.
 * @returns boolean: True if the file is available on the network, false otherwise.
 */
const fileChallenge = (ipfsNode, CID) => __awaiter(void 0, void 0, void 0, function* () {
    // Get a challenge block from the IPFS node
    // let challengeBlockCID = await getChallengeBlockCID(ipfsNode, CID)
    var e_1, _a;
    // See if we can initiate a download based on a block ID
    let ret = false;
    try {
        // await ipfsNode.cat(challengeBlockCID)
        //     .then(async (_: any) => {
        //         ret = true
        //     }).catch(async (err: any) => {
        //         console.log(err)
        // })
        for (var _b = __asyncValues(ipfsNode.cat(CID)), _c; _c = yield _b.next(), !_c.done;) {
            const chunk = _c.value;
            ret = true;
            break;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return ret;
});
/**
 * Summary: Determine the CID of a deterministic challenge block for a file
 * @param ipfsNode: The IPFS node we want to use to generate the challenge block.
 * @param CID: The CID of the file we want to get a challenge block for.
 * @returns ChallengeBlockCID: The challenge block CID for the file as a promise
 */
const getChallengeBlockCID = (ipfsNode, CID) => __awaiter(void 0, void 0, void 0, function* () {
    // Get all the block IDs for the file
    console.log("eggg");
    const links = yield ipfsNode.object.links(CID);
    const hashes = links.map((link) => link.Hash.toString());
    // Get a deterministic block index based on the hash of the file and the current time
    let index = SHA256(CID, Date.now()) % hashes.length;
    // Return the hash of the block at the deterministic index
    return hashes[index];
});
