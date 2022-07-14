const fs = require('fs');

/**
 * Summary: Builds a list of test cases from a list of files
 * @param ipfsNode: A node for generating CIDs
 * @return {Promise<*[]>}
 */
const buildTestCases = async (ipfsNode) => {
    let pinnedFilesDir =  './test/testFiles/pinned';
    let unpinnedFilesDir = './test/testFiles/unpinned';

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

module.exports = buildTestCases;

/**
 * Summary: Preprocess a local file in to a test case by generating a CID and obao file
 * @param {string} filePath: the path to the file to preprocess
 * @param {boolean} pinned: whether the file is pinned on IPFS
 * @param {any} ipfsNode: the IPFS node to use for the test (in order to generate CIDs)
 * @returns {Promise<TestCase>}
 */
const buildTestCase = async (filePath, pinned, ipfsNode) => {
    // Read in the file
    let file = fs.readFileSync(filePath);
    // TODO: Get its CID over IPFS
    let CID = '';

    let testCase;
    let obaoPath = 'testCases/testBaos/' + filePath;

    await fs.stat(obaoPath, function(err, stat) {
        // If the file exists
        let obao;
        // If the files does not exist, generate a new one
        if (err.code === 'ENOENT') {
            // TODO: Build the obao
            obao = 'test';
            // Write the obao to obaoPath
            fs.writeFile(obaoPath, obao, function(err) {
                if (err) {
                    console.log("Could not write obao: ", obaoPath);
                    console.log(err);
                }
            });
        } else {
            let obao = fs.readFileSync(obaoPath);
        }
        // Determine the Root of the obao file
        let obaoRoot = obao + '-root'

        // Create a test case
        testCase = {
            fileDescription: {
                CID: CID,
                obaoPath: obaoPath,
            },
            fileRoot: obaoRoot,
            pinned: pinned,
        }
    });
    return testCase;
}