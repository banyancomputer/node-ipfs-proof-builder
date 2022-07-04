const SHA256 = require('crypto-js/sha256');
const cliProgress = require('cli-progress');
const toBuffer = require('it-to-buffer');

/**
 * The IPFS oracle that is used to query challenge blocks and submit proofs to a verifier.
 *
 * It pulls file identifiers and necessary metadata from a list of fileObjects.
 *
 * Once a challenge block is pulled, it is submitted to the verifier along with any sibling hashes.
 *
 * The verifier should have knowledge of the root hashes of each file in the network.
 */

/**
 * This type specifies what type of data we associate with a file in our network.
 * Each file should be indexed by a CID
 */
export type fileObject = {
    CID: String,  // The CID of the file
    tree: String, // The tree describing the file

    // TODO: Expand this object as our proofs become more complex
    // endpoints: ...
    // baoFile: ...
}

/**
 * This type specifies what is needed for a verifier to prove that a file is available.
 */
export type fileProof = {
    CID: String // A CID for lookup
    challenge: String // The challenge hash
    proof: any  // Some proof that works with our Merkle Library
    err: any // An error if one occurred during querying for a file
}


export type Options = {
    proofCallback?: (fp: fileProof) => void
}

/**
 * Summary: Generate a stamped merkle root for our network based on a list of CIDS.
 * @param ipfsNode:  The IPFS node we want to use in order to generate the root.
 * @param files:      The list of filesObjects we want to check.
 * @param options:  An object containing the following optional arguments:
 *        proofCallback: A callback that takes a fileProof object in as an argument. This can be used to store fileProofs
 *          in a database of your choice, or submit them to a verifier. It is the responsibility of the caller to
 *          provide a callback.
 * @returns {void}
 */

exports.proofOracle = async (
    timestamp: String,
    ipfsNode: any,
    files: fileObject[],
    options: Options = {}
): Promise<void> => {
    // Initialize our Merkle Tree
    console.log("Submitting proofs...")

    const proofProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    proofProgressBar.start(files.length, 0);

    for (let i = 0; i < files.length; i++) {
        // Get the proof of inclusion, returns a boolean if the file is found
        let proof = await fileChallenge(ipfsNode, files[i])

        // If the proof is valid, create a leaf in our Merkle Tree
        if (options.proofCallback) {
            // Retrun the proof to the caller
            options.proofCallback(proof)
        }
        proofProgressBar.update(i + 1)
    }
    proofProgressBar.stop();
}

/**
 * Summary: Build a fileProof for the availability of a file based on a fileObject.
 * @param ipfsNode: The IPFS node we want to use to generate the proof.
 * @param  fileObject: The fileObject we want to check.
 * @param options: optional arguments:
 *  timeout: how long we should try downloading a file before giving up
 * @returns fileProof: should be enough to verify the availability of a file
 */
const fileChallenge = async (
    ipfsNode: any,
    fileObject: fileObject,
    options: {timeout?: number} = {}
) => {
    // Declare a variable to hold our fileProof
    let result: fileProof = {
        CID: fileObject.CID,
        challenge: '',
        proof: [],
        err: ''
    }

    // Determine the challenge block CID for the file
    let challengeCID = await getChallengeBlockCID(ipfsNode, fileObject.CID)

    // Get the challenge block, keepig track of errors
    try {
        result.challenge = await ipfsNode.cat(challengeCID, {timeout: options.timeout || 1000})
    }
    catch (err) {
        result.err = err
    }

    // Build a proof for the challenge block
    result.proof = await getFileProofHashes(result.challenge, fileObject.tree)

    // Return the fileProof
    return result
}

/**
 * Summary: Get the proof for a challenge block based on its Merkle Strcture.
 * @param challenge
 * @param tree
 */
const getFileProofHashes = async (challenge: String, tree: String) => {
    return []
}

/**
 * Summary: Query for a challenge block based on a CID of a file
 * @param ipfsNode
 * @param CID
 */
const getChallengeBlock = async (ipfsNode: any, CID: String) => {
    let challengeCID = await getChallengeBlockCID(ipfsNode, CID)
    return await ipfsNode.cat(challengeCID)
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

/* DEPRECATED */

/**
 * Summary: Prove that a file is available on the network.
 * @param ipfsNode: The IPFS node we want to use to generate the proof.
 * @param CID: The CID of the file we want to check.
 * @param options: our optional arguments
 *  timeout: how long we want to run our checks for before they fail
 * @returns boolean: True if the file is available on the network, false otherwise.
 */
//  const fileProofDownload = async (
//     ipfsNode: any,
//     CID: String,
//     options: {timeout?: number} = {}
// ) => {
//     let proofTimeout = options.timeout || 1000  // ms
//     const source = await toBuffer(ipfsNode.cat(CID))
//     const hash = await ipfsNode.add(source, {onlyHash: true, timeout: proofTimeout}).cid.toString()
//     return hash === CID
// }