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
        // Filecoin Whitepapr
        'QmdhGTx5URGR1EwAPTTBV17QBmX7PDhuHrfFoiVzSjBsu7',
        // non-existant file
        "Qmad1E95Qb4U329aHdGpxUuPRErYuFKGYpzNo6ZL8FPxwe",
        // My transcript unpinned
        'Qmad1E95Qb4U329aHdGpxUuPRErYuFKGYpzNo6ZL8FPxwz',

        // My thesis never pinned
        "QmeQ3653QvNpZ4F2iJF5Q5chAPQHgf3VcLZo5HZfbBNJNg",

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
    const testTimestamp =  Date.now();

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
        for (var i = 0; i < 3; i++)
        { 
            let proof = fileProofDict[testCIDS[i]];
            console.log("Testing inclusion of pinned file: " + testCIDS[i]);
            let result = await fileStatus(testCIDS[i], proof, root);
            expect(result).toBe(true);
        }
    }, 10000);

    it("Verify exclusion of a non-existant", async function() {
        // Test the exclusion of a file that is not pinned 
        let proof = fileProofDict[testCIDS[3]];
        console.log("Testing exclusion of non-existant file: " + testCIDS[3]);
        let result = await fileStatus(testCIDS[3], proof, root);
        expect(result).toBe(false);

    }, 10000);

    it("Verify exclusion of unpinned files", async function() {
        // Test the exclusion of a file that is not pinned 
        let proof = fileProofDict[testCIDS[5]];
        console.log("PROOF: ", proof)
        console.log("Testing exclusion of unpinned file: " + testCIDS[5]);
        let result = await fileStatus(testCIDS[5], proof, root);
        expect(result).toBe(false);

    }, 10000);
});

