import * as IPFS from 'ipfs-core';
import * as fs from 'fs';
import * as buildTestCases from "./helper/testCases.js";
// const {buildTestCases} = require('helpers/testCases');


describe("IPFS Proof Builder", function() {
    // Declare our IPFS node and Merkle Root
    let testIPFSNode, testCases;

    beforeAll(async function() {
        // Initialize a Testing IPFS node
        testIPFSNode = await IPFS.create();
        // Build our Test Cases
        testCases = await buildTestCases
    }, 10000)

    // Declare a callback to read our bao file in with
    const baoCallback = (baoPath) => {
        // console.log(fp)
        return fs.readFileSync(baoPath)
    };

    afterAll(async function() {
        // Shutdown our IPFS node
        await testIPFSNode.stop();
        // Maybe remove all leftover bao files
    });

    it("Building Proof for Pinned Files",  async function() {
        console.log("Building Proofs for pinned files")
    }, 10000);

    it("Building Proofs for unpinned Files",  async function() {
        console.log("Building Proofs for unpinned files")
    }, 10000);
});

