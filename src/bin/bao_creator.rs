use std::io::prelude::*;
use std::io::Cursor;
use bao::Hash;

// Create an outboard encoding of the input file. 
pub fn create_obao(whole_input: Vec<u8>) -> Result<(Vec<u8>, Hash), Box<dyn std::error::Error>> {

    let (obao, hash) = bao::encode::outboard(&whole_input);
    return Ok((obao, hash)); // return the outboard encoding
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    return Ok(()); 
}