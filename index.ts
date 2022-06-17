const { MerkleTree } = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');
const cliProgress = require('cli-progress');

/*
The IPFS Verifier that is used to check the status of a batch of files on the IPFS network.

It uses a list of CIDs in order to generate a times stamped root hash of each file's inclusion in the network.

This property of inclusion is used to prove the storage of a file on the IPFS network based on it's CID.

A client with knowledge of the root hash, a CID of a file, and the definition of our timestamp can check the status
of a file on the IPFS network through merkle proofs.
 */

// Our Module Exports

/**
 Each leaf in our Merkle Tree contains the file's CID and reproducible stamp.
 */
export type Leaf = {
    cid: String, // A CID,
    stamp: String // A generic String that describes a Stamp on the file
}

/**
 Our Merkle Tree can be described by its root hash, timestamp, and stamp function.
 */
export type TimestampedMerkleRoot = {
    root: String,  // Our root hash
    timestamp: String,  // Our timestamp
    stampFunction: (cid: String, timestamp: String) => String  // The stamp function used to generate our merkle root
}

export type Options = {
    stampFunction?: (cid: String, timestamp: String) => String,
    proofCallback?: (cid: String, proof: any) => void
}

/**
 * Summary: Generate a stamped merkle root for our network based on a list of CIDS.
 * @param timestamp: The timestamp we should use to stamp our leaves
 * @param ipfsNode:  The IPFS node we want to use in order to generate the root.
 * @param CIDs:      The list of CIDs we want to check.
 * @param options:  An object containing the following optional arguments:
        proofCallback: A callback that takes the CID and proofs of each generated leaf as an argument the result of the
                       function. This can be used to store proofs in a database of your choice
        stampCallback: A callback that takes a cid and timestamp and returns the stamp of the file. This can be used to
                       generate a custom timestamp for each leaf.
 * @returns TimestampedMerkleRoot The merkle root of the network. It is the caller's responsibility to provide a
    `proofCallback` should they want to store more information about the proofs.
 */

exports.fileProofMerkleRoot = async (
    timestamp: String,
    ipfsNode: any,
    CIDs: String[],
    options: Options = {}
): Promise<TimestampedMerkleRoot> => {
    console.log("Generating Merkle Root for CIDs: ", CIDs)
    // Initialize our return Object
    let returnObject: TimestampedMerkleRoot = {
        root: '',
        timestamp: timestamp,
        stampFunction: options.stampFunction || defaultStamp
    }

    // Create a new merkle tree
    var leaves = []
    // For each CID, generate a proof of inclusion
    console.log("Generating proofs...")
    const proofProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    proofProgressBar.start(CIDs.length, 0);
    for (let i = 0; i < CIDs.length; i++) {
        // Get the proof of inclusion, returns a boolean if the file is found
        let proof = await fileProof(ipfsNode, CIDs[i])

        console.log("\nFile Reachable: ", proof, CIDs[i])

        // If the proof is valid, stamp it and add it to the list of leaves
        if (proof) {
            let leaf: Leaf = {
                cid: CIDs[i],
                stamp: returnObject.stampFunction(CIDs[i], timestamp)
            }
            // Append a hash of the leaf to the list of leaves
            leaves.push(leaf)
        }
        proofProgressBar.update(i + 1)
    }
    proofProgressBar.stop();
    console.log("Generating Merkle Tree...")
    // Create a new merkle tree based on our leaves
    
    leaves = leaves.map(x => SHA256(x.cid, x.stamp))

    const tree = new MerkleTree(leaves, SHA256)
    // And get a root hash
    returnObject.root = tree.getRoot().toString('hex')

    console.log(tree.toString())
    // console.debug('[IPFS Verifier] Generated merkle root: ', returnObject.root)

    // If we have a callback for storing our proofs, call it on each leaf
    if (options.proofCallback) {
        console.log("Saving proofs...")
        proofProgressBar.start(CIDs.length, 0);
        // For each leaf,
        for (let i = 0; i < leaves.length; i++) {

            // Hash it and get its proof
            // https://github.com/miguelmota/merkletreejs/blob/master/docs/classes/_src_merkletree_.merkletree.md#getproof
            let proof2 = tree.getProof(leaves[i])
            // console.debug('[IPFS Verifier] Proof of inclusion for leaf ', leaves[i], ": ", proof)

            // Call the callback with the proof object
            
            options.proofCallback(CIDs[i], proof2)
            proofProgressBar.update(i + 1)
        }
        proofProgressBar.stop();
    }
    return returnObject
}

/**
 * Summary: Verify a file's inclusion in a timestamped Merkle Tree
 * @param CID: The CID of the file we want to check
 * @param proof: The proof of inclusion of the file
 * @param merkleRoot: The Timestamped Merkle Root of the network
 * @returns boolean: True if the file is available on the network, false otherwise
 */
exports.fileStatus = async (CID: String, proof: any, merkleRoot: TimestampedMerkleRoot) => {
    // Calculate the leaf of the file based on the CID and the timestamp
    let leaf: Leaf = {
        cid: CID,
        stamp: merkleRoot.stampFunction(CID, merkleRoot.timestamp)
    }

    console.log("Testing inclusions of Leaf: ", leaf)

    // Verify the proof of inclusion using the Merkle Tree
    return MerkleTree.verify(proof, SHA256(leaf.cid,leaf.stamp), merkleRoot.root)
}

/* Helper Functions and Defaults */

/**
 * Summary: Default stamp function that generates a timestamp based on the CID and the timestamp.
 * @param cid: The CID of the file we want to stamp
 * @param timestamp: The timestamp we want to stamp the file with
 * @returns String: The stamp of the file
 */
const defaultStamp = (cid: String, timestamp: String): String => {
    return SHA256(cid, timestamp).toString()
}

//TODO: Implement checking file status using Merkle Proofs
/**
 * Summary: Prove that a file is available on the network.
 * @param ipfsNode: The IPFS node we want to use to generate the proof.
 * @param CID: The CID of the file we want to check.
 * @returns boolean: True if the file is available on the network, false otherwise.
 */
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
    let ret = false
    for await (const chunk of ipfsNode.cat(CID)) {
        ret = true
        break
    }
    // const fileStatus = await ipfsNode.files.stat("/ipfs/",CID)
    // return fileStatus.cid.toString() === CID
    return ret
}

/**
 * Summary: Get a deterministic challenge block for a file
 * @param ipfsNode: The IPFS node we want to use to generate the challenge block.
 * @param CID: The CID of the file we want to get a challenge block for.
 * @returns ChallengeBlock: The challenge block for the file as a promise
 */
const getChallengeBlock = async (ipfsNode: any, CID: String) => {
    // Get all the block IDs for the file
    const links = await ipfsNode.object.links(CID)
    const hashes = links.map((link: any) => link.Hash.toString())

    // Get a deterministic block index based on the hash of the file and the current time
    let index = SHA256(CID, Date.now()) % hashes.length
    let block_cid = hashes[index]

    // Return the contents of the block
    return ipfsNode.cat(block_cid)
}
