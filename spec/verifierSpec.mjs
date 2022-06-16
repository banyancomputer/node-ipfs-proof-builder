import * as IPFS from 'ipfs-core';

// Import our Implementation of the IPFS Verifier
import {fileProofMerkleRoot, fileStatus} from '../index.js';

describe("IPFS Verifier Test Suite", function() {
    // Declare our IPFS node and Merkle Root
    let testIPFSNode, root;

    // Declare what files we want to test
    const testCIDS = [
        // Pinned Files

        // The Bitcoin whitepaper
        'QmRA3NWM82ZGynMbYzAgYTSXCVM14Wx1RZ8fKP42G6gjgj',
        // The Ehtereum whitepaper
        'Qmd63gzHfXCsJepsdTLd4cqigFa7SuCAeH6smsVoHovdbE',

        // Non-Existent/Non-Pinned Files
        // ...
    ]

    // Declare a dictionary of proofs for each file
    let fileProofDict = {};

    // Declare a callback to store the proofs
    const proofCallback = (cid, proof) => {
        // console.log(`Proof for ${cid}`);
        // console.log(proof);
        fileProofDict[cid] = proof;
    };

    // Declare a Timestamp to test with
    const testTimestamp = Date.now();

    // Before each test, initialize a new IPFS node and build a new root
    beforeAll(async function() {
        // Initialize our IPFS node
        console.log("Initializing Test IPFS node...");
        testIPFSNode = await IPFS.create();

        // Build a new Merkle Root
        console.log("Building Merkle Root...");
        root = await fileProofMerkleRoot(testTimestamp, testIPFSNode, testCIDS, {proofCallback: proofCallback});

        console.log("Testing against new Root: " + JSON.stringify(root));
    }, 300000);

    afterAll(async function() {
        // Shutdown our IPFS node
        await testIPFSNode.stop();
    });

    it("Verify inclusion of pinned files",  async function() {
        // Test the inclusion of one of our pinned files
        let proof = fileProofDict[testCIDS[0]];
        console.log("Testing inclusion of pinned file: " + testCIDS[0]);
        console.log("Proof: " + JSON.stringify(proof));
        let result = await fileStatus(testCIDS[0], proof, root);
        expect(result).toBe(true);
    }, 10000);
});

