const SHA256 = require('crypto-js/sha256');
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
 * This type describes what type of data we associate with a file in our network.
 * Each file should be indexed by a CID and should include a reference/path to an obao file
 */
export type fileDesc = {
    CID: String,  // The CID of the file
    oboaPath: String, // The tree describing the file

    // TODO: Expand this object as our proofs become more complex
    // endpoints: ...
}

/**
 * This type specifies what is needed for a verifier to prove that a file is available.
 */
export type fileProof = {
    CID: String // A CID for lookup
    challenge: String // The challenge hash
    proof: any[]  // Some proof that works with our Merkle Library
    err: any // An error if one occurred during querying for a file
}


export type Options = {
    obaoCallback?: (obaoPath: String) => Promise<any>,
    challengeTimeout?: number
}

/**
 * Summary: Generate a stamped merkle root for our network based on a list of CIDS.
 * @param ipfsNode:  The IPFS node we want to use in order to generate the root.
 * @param files:      The list of filesObjects we want to check.
 * @param options:  An object containing the following optional arguments:
 *      - obaoCallback: A custom callback for reading obao files given an oboaPath
 *      - challengeTimeout: how long to attempt querying for a challenge before timing out
 * @returns {fileProof}
 */

exports.buildProof = async (
    timestamp: String,
    ipfsNode: any,
    file: fileDesc,
    options: Options = {}
): Promise<fileProof> => {
    // Declare a return object to hold our fileProof
    let result: fileProof = {
        CID: file.CID,
        challenge: '',
        proof: [],
        err: ''
    }

    // Determine the challenge block CID for the file
    let challengeCID = await getChallengeBlockCID(ipfsNode, file.CID)

    // Get the challenge block, keeping track of errors
    try {
        result.challenge = await ipfsNode.cat(challengeCID, {timeout: options.challengeTimeout || 1000})
    }
    catch (err) {
        result.err = err
    }

    // Build a proof for the challenge block
    if (options.obaoCallback) {
        // Read in the obao file using the specified callback
        let obaoFile: any = await options.obaoCallback(file.oboaPath)
        // Build the proof for the challenge block
        result.proof = await getFileProofHashes(result.challenge, obaoFile)
    } else {
        console.log("Warning: No obao callback specified, skipping proof building")
    }

    // Return the fileProof
    return result
}

/**
 * Summary: Get the proof for a challenge block based on its Merkle Structure.
 * @param challenge: The challenge block we want to get a proof for.
 * @param obaoFile: The obao file we want to use to get the proof.
 */
const getFileProofHashes = async (challenge: String, obaoFile: any) => {
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