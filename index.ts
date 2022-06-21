const { MerkleTree } = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');
const cliProgress = require('cli-progress');

/**
 * The IPFS Verifier that is used to check the status of a batch of files on the IPFS network.
 *
 * It uses a list of fileObjects in order to generate a times stamped root hash of each file's inclusion in the network.
 *
 * This property of inclusion is used to prove the storage of a file on the IPFS network based on it's CID.
 *
 * A client with knowledge of our Timestamped Merkle Root, a CID of a file, a proof of the file's inclusion, can check
 * the status of a file on the IPFS network through merkle proofs.
 */

// Our Module Exports

/**
 * This type specifies what data should be stored in the file object
 * Each file should be indexed by a CID
 */
export type fileObject = {
    CID: String,
    // TODO: Expand this object as our proofs become more complex
    // endpoints: ...
    // baoFile: ...
}

/**
 * Each leaf in our Merkle Tree contains the file's CID and reproducible stamp.
 */
export type Leaf = {
    CID: String, // A CID,
    timestamp: String, // A timestamp
}

/**
 * This type specifies what is needed to save a file's proof-of-inclusion in our TimestampedMerkleRoot
 */
export type fileProof = {
    CID: String // A CID for lookup
    proof: any  // Some proof that works with our Merkle Library
}

/**
 * Our Merkle Tree can be described by its root hash and timestamp.
 */
export type TimestampedMerkleRoot = {
    root: String,  // The root hash
    timestamp: String,  // A timestamp
}

export type Options = {
    proofCallback?: (fp: fileProof) => void
}

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
 *  `proofCallback` should they want to store more information about the proofs.
 */

exports.fileProofMerkleRoot = async (
    timestamp: String,
    ipfsNode: any,
    files: fileObject[],
    options: Options = {}
): Promise<TimestampedMerkleRoot> => {
    // Initialize our Merkle Tree
    let returnObject: TimestampedMerkleRoot = {
        root: '',
        timestamp: timestamp,
    }

    // Declare an array to hold our leaves
    let leaves = []

    // For each CID, generate a proof of inclusion
    console.log("Generating proofs...")

    const proofProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    proofProgressBar.start(files.length, 0);

    for (let i = 0; i < files.length; i++) {
        // Get the proof of inclusion, returns a boolean if the file is found
        let fileAvailable = await fileChallenge(ipfsNode, files[i].CID)

        // If the proof is valid, create a leaf in our Merkle Tree
        if (fileAvailable) {
            let leaf: Leaf = {
                CID: files[i].CID,
                timestamp: timestamp,
            }
            // Append the leaf to the list of leaves
            leaves.push(leaf)
        }
        proofProgressBar.update(i + 1)
    }
    proofProgressBar.stop();

    console.log("Generating Merkle Tree...")

    // Generate stamps of all the leaves to build our tree with
    let stampedLeaves = leaves.map(x => stampFunction(x))
    // Generate the tree
    const tree = new MerkleTree(stampedLeaves, SHA256);
    // Extract the Root Hash from our Merkle Tree
    returnObject.root = tree.getRoot().toString('hex')

    // If we have a callback for storing our proofs, call it on each leaf
    if (options.proofCallback) {
        console.log("Saving proofs...")
        proofProgressBar.start(files.length, 0);
        // For each hashed leaf,
        for (let i = 0; i < leaves.length; i++) {
            // Declare a new fileProof object
            let fp: fileProof = {
                CID: leaves[i].CID,
                // Retrieve the proof for the stamped leaf from the tree
                proof: tree.getProof(stampedLeaves[i])
            }

            // Call the callback on the fileProof
            options.proofCallback(fp)
            proofProgressBar.update(i + 1)
        }
        proofProgressBar.stop();
    }
    // Return our Merkle Tree
    return returnObject
}

/**
 * Summary: Verify a file's inclusion in a timestamped Merkle Tree
 * @param CID: the CID of the file we want to prove the availability of
 * @param proof: The proof of inclusion of the leaf
 * @param merkleRoot: The Timestamped Merkle Root of the network
 * @returns boolean: True if the file is available on the network, false otherwise
 */
exports.fileStatus = async (CID: String, proof: any, merkleRoot: TimestampedMerkleRoot) => {
    // Determine the leaf of the file based on the CID and the timestamp
    let leaf: Leaf = {
        CID: CID,
        timestamp: merkleRoot.timestamp
    }

    // Verify the proof of inclusion using our Merkle Root
    return MerkleTree.verify(proof, stampFunction(leaf), merkleRoot.root)
}

/* Helper Functions and Defaults */

/**
 * Summary: Function that stamps a leaf use SHA256
 * @param leaf: The leaf we want to stamp
 * @returns String: The stamp of the leaf
 */
const stampFunction = (leaf: Leaf): String => {
    return SHA256(leaf.CID, leaf.timestamp).toString()
}

//TODO: Implement checking file status using Merkle Proofs
/**
 * Summary: Prove that a file is available on the network.
 * @param ipfsNode: The IPFS node we want to use to generate the proof.
 * @param CID: The CID of the file we want to check.
 * @returns boolean: True if the file is available on the network, false otherwise.
 */
const fileChallenge = async (
    ipfsNode: any,
    CID: String,
) => {
    // Get a challenge block from the IPFS node
    // let challengeBlockCID = await getChallengeBlockCID(ipfsNode, CID)

    try {
        for await (const _ of ipfsNode.cat(CID)) { return true }
    } catch (e) {
        console.log(e)
        return false
    }
}


/**
 * Summary: Determine the CID of a deterministic challenge block for a file
 * @param ipfsNode: The IPFS node we want to use to generate the challenge block.
 * @param CID: The CID of the file we want to get a challenge block for.
 * @returns ChallengeBlockCID: The challenge block CID for the file as a promise
 */
const getChallengeBlockCID = async (ipfsNode: any, CID: String) => {
    // Get all the block IDs for the file
    const links = await ipfsNode.object.links(CID)
    const hashes = links.map((link: any) => link.Hash.toString())

    // Get a deterministic block index based on the hash of the file and the current time
    let index = SHA256(CID, Date.now()) % hashes.length

    // Return the hash of the block at the deterministic index
    return hashes[index]
}
