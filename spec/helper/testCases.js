const {FileDesc} = require('../../index');
const fs = require('fs');

// Each Test Case is described by
export type TestCase = {
    fileDesc: FileDesc, // The File Description of the test case file
    fileRoot: String,  // THe Merkle Root of the test case
    filePinned: Boolean // Whether the file is pinned on IPFS
}

/**
 * Summary: Builds a list of test cases from a list of files
 * @param ipfsNode: A node for generating CIDs
 * @return {Promise<*[]>}
 */
export const buildTestCases = async (ipfsNode) => {
    let pinnedFilesDir =  './test/testFiles/pinned';
    let unpinnedFilesDir = './test/testFiles/unpinned';

    // Iterate through the pinned files

    // Build our pinned test cases
    let pinnedTestCases = [];
    let pinnedFiles = fs.readdirSync(pinnedFilesDir);
    for (let i = 0; i < pinnedFiles.length; i++) {
        let filePath = pinnedFilesDir + '/' + pinnedFiles[i];
        let testCase = buildTestCase(filePath, true, ipfsNode);
        pinnedTestCases.push(testCase);
    }

    // Build our unpinned test cases
    let unpinnedTestCases = [];
    let unpinnedFiles = fs.readdirSync(unpinnedFilesDir);
    for (let i = 0; i < unpinnedFiles.length; i++) {
        let filePath = unpinnedFilesDir + '/' + unpinnedFiles[i];
        let testCase = buildTestCase(filePath, false, ipfsNode);
        unpinnedTestCases.push(testCase);
    }

    return pinnedTestCases.concat(unpinnedTestCases);
}

/**
 * Summary: Preprocess a local file in to a test case
 * @param {string} filePath: the path to the file to preprocess
 * @param {boolean} pinned: whether the file is pinned on IPFS
 * @param {any} ipfsNode: the IPFS node to use for the test (in order to generate CIDs)
 * @returns {Promise<TestCase>}
 */
const buildTestCase = async (filePath, pinned, ipfsNode) => {
    // Read in the file
    let file = '';
    // Get its CID over IPFS
    let CID = '';

    let obaoPath = 'testCases/testBaos/' + filePath;
    // Check if the file's obao is already available
    fs.stat(obaoPath, function(err, stat) {
        // If the file exists
        if (err.code === 'ENOENT') {
            // Build the obao
            let obao = 'test';
            // Write the obao to obaoPath
            fs.writeFile(obaoPath, obao, function(err) {
                if (err) {
                    console.log("Could not write obao: ", obaoPath);
                    console.log(err);
                }
            });
        } else {
            console.log('Unexpected error creating obao', err.code);
        }
    });

    // Read in the obao
    let obao = fs.readFileSync(obaoPath);

    // Determine the Root used to verify proofs
    let obaoRoot = oboa + '-root'

    return {
        fileDesc: {
            CID: CID,
            obaoPath: obaoPath
        },
        fileRoot: obaoRoot,
        filePinned: pinned
    }
}