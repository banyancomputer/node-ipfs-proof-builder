use std::io::prelude::*;
use std::io::Cursor;
//use std::fs::File;


// Create an outboard encoding of the input file. 
pub fn create_obao(whole_input: Vec<u8>) -> Result<Vec<u8>, Box<dyn std::error::Error>> {

    let mut obao = Vec::new();
    let mut encoder = bao::encode::Encoder::new_outboard(Cursor::new(&mut obao));
    encoder.write_all(&whole_input)?;
    encoder.finalize()?;
    return Ok(obao); // return the outboard encoding
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    return Ok(()); 
}