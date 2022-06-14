const { MerkleTree } = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');

/*
The IPFS Verifier that is used to check the status of a batch of files on the IPFS network.

It uses a list of CIDs in order to generate a times stamped root hash of each file's inclusion in the network.

This property of inclusion is used to prove the storage of a file on the IPFS network based on it's CID.

A client with knowledge of the root hash, a CID of a file, and the definition of our timestamp can check the status
of a file on the IPFS network through merkle proofs.
 */

// Our Module Exports

// Our definition of a leaf in our Merkle Trees
export type Leaf = {
    cid: String, // A CID,
    stamp: String // A generic String that describes a Stamp on the file
}

// Our definition or our Merkle Root
export type TimestampedMerkleRoot = {
    root: String,  // Our root hash
    timestamp: String,  // Our timestamp
    stampFunction: (cid: String, timestamp: String) => String  // The stamp function used to generate our merkle root
}

// Our default function for stamping a file's inclusion in the network.
export const defaultStamp = (cid: String, timestamp: String): String => {
    return SHA256(cid, timestamp).toString()
}

/*
Generate a stamped merkle root for our network based on a list of CIDS.
    ** Arguments **
    TODO: Settle on whether this is an IPFS node or an HTTP client
    timestamp: The timestamp of the root hash
    ipfsNode: The IPFS node we want to use in order to generate the root. This must be a fully initialized node.
    cids: The list of CIDs we want to check.

    ** Optional Arguments **
    options: An object containing the following optional arguments:
        proofCallback: A callback that takes the CID and proofs of each generated leaf as an argument the result of the
                       function. This can be used to store proofs in a database of your choice
        stampCallback: A callback that takes a cid and timestamp and returns the stamp of the file. This can be used to
                       generate a custom timestamp for each leaf. If not supplied our default stamp function will be used.

    ** Returns **
    This method only returns the merkle root to the caller. It is the caller's responsibility to provide a
    `proofCallback` should they want to store more information about the proofs.
 */

export type Options = {
    stampFunction?: (cid: String, timestamp: String) => String,
    proofCallback?: (cid: String, proof: any) => void
}

export const fileProofMerkleRoot = async  (
    timestamp: String,
    ipfsNode: any,
    CIDs: String[],
    options: Options = {}
) => {
    // Initialize our return Object
    let returnObject: TimestampedMerkleRoot = {
        root: '',
        timestamp: timestamp,
        stampFunction: options.stampFunction || defaultStamp
    }

    // Create a new merkle tree
    let leaves = []
    // For each CID, generate a proof of inclusion
    for (let i = 0; i < CIDs.length; i++) {
        // Get the proof of inclusion, returns a boolean if the file is found
        let proof = await fileProof(ipfsNode, CIDs[i])

        // If the proof is valid, stamp it and add it to the list of leaves
        if (proof) {
            let leaf: Leaf = {
                cid: CIDs[i],
                stamp: returnObject.stampFunction(CIDs[i], timestamp)
            }
            leaves.push(leaf)
        }
    }

    // Create a new merkle tree based
    const tree = new MerkleTree(leaves, SHA256, { hashLeaves: true })
    const root = tree.getRoot().toString('hex')

    console.debug('[IPFS Verifier] Generated merkle root: ', root)

    // If we have a callback, call it with the proofs of each leaf
    if (options.proofCallback) {
        // For each leaf,
        for (let i = 0; i < leaves.length; i++) {

            // Hash it and get its proof
            // https://github.com/miguelmota/merkletreejs/blob/master/docs/classes/_src_merkletree_.merkletree.md#getproof
            let proof = tree.getProof(SHA256(leaves[i]))

            console.debug('[IPFS Verifier] Proof of inclusion for leaf ', leaves[i], ": ", proof)

            // Call the callback with the proof object
            options.proofCallback(leaves[i].cid, proof)
        }
    }
    return root
}

// Verify a file's inclusion in the network the file's metadata (CID, Proof) and our Merkle Root returned by the
// IPFS Verifier
export const fileStatus = async (CID: String, proof: any, merkleRoot: TimestampedMerkleRoot) => {
    // Calculate the leaf of the file based on the CID and the timestamp
    let leaf: Leaf = {
        cid: CID,
        stamp: merkleRoot.stampFunction(CID, merkleRoot.timestamp)
    }

    // TODO: Figure out if this works without having to recreate the merkle tree
    let tree = new MerkleTree([], SHA256, { hashLeaves: true })

    // Verify the proof of inclusion using the Merkle Tree
    return tree.verify(proof, leaf, merkleRoot.root)
}

//TODO: Implement checking file status using Merkle Proofs
// Prove the storage of a file on the IPFS network based on it's CID
const fileProof = async (
    ipfsNode: any,
    CID: String,
    //tree: MerkleTree,
) => {
    // Get a challenge block from the IPFS node
    // let challengeBlock = await getChallengeBlock(ipfsNode, CID)

    // Check if the challenge block is valid against our maintained Merkle Tree
    // let root = tree.getRoot().toString('hex')
    // let leaf = SHA256(challengeBlock.data).toString()
    // let proof = tree.getProof(leaf)
    // return tree.verify(proof, leaf, tree.root)

    const fileStatus = await ipfsNode.files.stat(CID)
    return fileStatus.cid.toString() === CID
}


// Generate a deterministic block index from a file using a Hash of the file's CID and a timestamp
const getChallengeBlock = async (ipfsNode: any, CID: String) => {
    // Get all the block IDs for the file
    const links = await ipfsNode.object.links(CID)
    const hashes = links.map((link: any) => link.Hash.toString())

    // Get a deterministic block index based on the hash of the file and the current time
    let index = SHA256(CID, Date.now()) % hashes.length
    let block_cid = hashes[index]

    // Return the contents of the block
    return await ipfsNode.cat(block_cid)
}
