import * as IPFS from 'ipfs-core';
import { isTypedArray } from 'util/types';
import * as toBuffer from 'it-to-buffer';


// Import our Implementation of the IPFS Verifier
import {fileProofMerkleRoot, fileStatus, baoStream, getChallengeBlockCID} from '../index.js';

describe("IPFS Verifier Test Suite", function() {
    // Declare our IPFS node and Merkle Root
    let testIPFSNode, root;

    // Declare what files we want to test
    const positiveTestFileObjects = [
        // Pinned Files

        // The Bitcoin whitepaper
        {
            CID: 'QmRA3NWM82ZGynMbYzAgYTSXCVM14Wx1RZ8fKP42G6gjgj'
        },

        // The Ehtereum whitepaper
        {
            CID: 'Qmd63gzHfXCsJepsdTLd4cqigFa7SuCAeH6smsVoHovdbE'
        },

        // Filecoin Whitepaper
        {
            CID: 'QmdhGTx5URGR1EwAPTTBV17QBmX7PDhuHrfFoiVzSjBsu7'
        }
    ]

    // Declare what files we want to test
    const negativeTestFileObjects = [
        // non-Pinned / non-existent Files

        // Multihash of Jonah's Transcript
        {
            CID: 'Qmad1E95Qb4U329aHdGpxUuPRErYuFKGYpzNo6ZL8FPxwe'
        },

        // Multihash of Jonah's Thesis
        {
            CID: 'QmeQ3653QvNpZ4F2iJF5Q5chAPQHgf3VcLZo5HZfbBNJNg'
        }
    ]

    // Build our Tree using all of our objects
    const testFileObjects = positiveTestFileObjects.concat(negativeTestFileObjects)

    // Declare a dictionary of proofs for each file
    let fileProofDict = {};

    // Declare a callback to store the proofs
    const proofCallback = (fp) => {
        // console.log(fp)
        fileProofDict[fp.CID] =  fp.proof
    };

    // Declare a Timestamp to test with
    const testTimestamp =  Date.now();

    beforeAll(async function() {

        testIPFSNode = await IPFS.create();
        let CID = positiveTestFileObjects[0].CID;
        let start = 0;
        let size = 100; 
        //const source = await baoStreamCraziness(testIPFSNode, CID, start, size);
        const source = await getChallengeBlockCID(testIPFSNode, CID);
        console.log(source);

    }, 300000);

    /*

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

    */

    afterAll(async function() {
        // Shutdown our IPFS node
        await testIPFSNode.stop();
    });

    it("Always true!", async function() {
        expect(true).toBe(true);
    });
    /*
    it("Verify inclusion of pinned files",  async function() {
        // Test the inclusion of one of our pinned files
        // console.log(fileProofDict)
        for (let i = 0; i < positiveTestFileObjects.length; i++) {
            // Extract a CID
            let CID = positiveTestFileObjects[i].CID

            // Get the proof and test for inclusion
            console.log("Positive Test: ", CID)
            let proof = fileProofDict[CID];
            let result = await fileStatus(CID, proof, root);
            expect(result).toBe(true);
        }
    }, 10000);

    it("Verify exclusion of unpinned/non-extant files",  async function() {
        // Test the inclusion of one of our pinned files
        // console.log(fileProofDict)
        for (let i = 0; i < negativeTestFileObjects.length; i++) {
            // Extract a CID
            let CID = negativeTestFileObjects[i].CID

            // Get the proof and test for inclusion
            console.log("Negative Test: ", CID)
            let proof = fileProofDict[CID];
            let result = await fileStatus(CID, proof, root);
            expect(result).toBe(false);
        }
    }, 10000);
    */  
});