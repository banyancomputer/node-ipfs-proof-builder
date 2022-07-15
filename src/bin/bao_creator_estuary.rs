/*
This script should be integrated with Estuary. The OBAO file should be sent to the oracle for proof construction, and to the
client for verified streaming. The hash should be sent to Governance for verification.
*/
use anyhow::Result;
use bao::Hash;

// Create an outboard encoding of the input file.
pub fn create_obao(whole_input: Vec<u8>) -> Result<(Vec<u8>, Hash)> {
    let (obao, hash) = bao::encode::outboard(&whole_input);
    Ok((obao, hash)) // return the outboard encoding
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    unimplemented!();
}
