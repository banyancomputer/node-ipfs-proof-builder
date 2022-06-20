import * as IPFS from 'ipfs-core';

// Import our Implementation of the IPFS Verifier
import {fileProofMerkleRoot, fileStatus} from '../index.js';

describe("IPFS Verifier Test Suite", function() {
    // Declare our IPFS node and Merkle Root
    let testIPFSNode, root;

    // Declare what files we want to test
    const testFileObjects = [
        // Pinned Files

        // The Bitcoin whitepaper
        {
            CID: 'QmRA3NWM82ZGynMbYzAgYTSXCVM14Wx1RZ8fKP42G6gjgj',
            salt: 'Bitcoin',
        },

        // The Ehtereum whitepaper
        {
            CID: 'Qmd63gzHfXCsJepsdTLd4cqigFa7SuCAeH6smsVoHovdbE',
            salt: 'Ethereum',
        },
        //
        // // Filecoin Whitepaper
        // {
        //     CID: 'QmdhGTx5URGR1EwAPTTBV17QBmX7PDhuHrfFoiVzSjBsu7',
        //     salt: 'Filecoin'
        // }


        // Non-Existent/Non-Pinned Files
        // ...
    ]

    // Declare a dictionary of proofs for each file
    let fileProofDict = {};

    // Declare a callback to store the proofs
    const proofCallback = (fp) => {
        // console.log(fp)
        fileProofDict[fp.leaf.CID] = {
            leaf: fp.leaf, proof: fp.proof
        };
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
        root = await fileProofMerkleRoot(testTimestamp, testIPFSNode, testFileObjects, {proofCallback: proofCallback});
        console.log("Testing against new Root: " + JSON.stringify(root));
    }, 300000);

    afterAll(async function() {
        // Shutdown our IPFS node
        await testIPFSNode.stop();
    });

    it("Verify inclusion of pinned files",  async function() {
        // Test the inclusion of one of our pinned files
        console.log(fileProofDict)
        let fp = fileProofDict[testFileObjects[0].CID];
        console.log("Testing inclusion of pinned file: ", fp.leaf);
        console.log("Proof: ", fp.proof);
        let result = await fileStatus(fp.leaf, fp.proof, root);
        expect(result).toBe(true);
    }, 10000);
});
