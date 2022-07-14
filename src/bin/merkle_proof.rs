#![allow(dead_code, unused)]
use rand::prelude::*;
use std::io::prelude::*;
use std::io::{Cursor, SeekFrom};
use std::fs::File;

use crate::bao_creator::create_obao;
mod bao_creator;

struct FakeSeeker<R: Read> {
    reader: R,
    bytes_read: u64,
}

impl<R: Read> FakeSeeker<R> {
    fn new(reader: R) -> Self {
        Self {
            reader,
            bytes_read: 0,
        }
    }
}

impl<R: Read> Read for FakeSeeker<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let n = self.reader.read(buf)?;
        self.bytes_read += n as u64;
        Ok(n)
    }
}

impl<R: Read> Seek for FakeSeeker<R> {
    fn seek(&mut self, _: SeekFrom) -> std::io::Result<u64> {
        // Do nothing and return the current position.
        Ok(self.bytes_read)
    }
}

fn create_slice(obao:Vec<u8>, chunks: &[u8], start_index: usize) -> Result<Vec<u8>, Box<dyn std::error::Error>> {

    let mut extractor2 = bao::encode::SliceExtractor::new_outboard(
        FakeSeeker::new(chunks),
        Cursor::new(&obao[..]),
        start_index.try_into().unwrap(),
        1024,
    );
    let mut slice2 = Vec::new();
    extractor2.read_to_end(&mut slice2)?;
    return Ok(slice2);
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test] 
    fn obao_slice_random_input_file() -> Result<(), Box<dyn std::error::Error>> {
        let mut whole_input = vec![0u8; 1 << 20];
        rand::thread_rng().fill(&mut whole_input[..]);
        let (obao, _hash) = create_obao_2(whole_input.clone())?;

        // Use the outboard encoding to extract a slice for the range 2048..3072 the usual way. This
        // requires the whole input file, but it'll only read the second and third chunks.
        let start_index = 2048;
        let mut extractor = bao::encode::SliceExtractor::new_outboard(
            Cursor::new(&whole_input[..]),
            Cursor::new(&obao[..]),
            start_index.try_into().unwrap(),
            1024,
        );
        let mut slice = Vec::new();
        extractor.read_to_end(&mut slice)?;
        let chunks = &whole_input[start_index * 1..start_index + 1024];
        let slice2 = create_slice(obao, chunks, start_index)?;
        assert_eq!(slice, slice2);
        Ok(())
    }   
    #[test] 
    fn verify_slice() -> Result<(), Box<dyn std::error::Error>> {

        let mut whole_input = vec![0u8; 1 << 20];
        rand::thread_rng().fill(&mut whole_input[..]);
        let (obao, hash) = create_obao_2(whole_input.clone())?;

        let start_index = 2048;
        let slice_len = 1024;
        let chunks = &whole_input[start_index..start_index + slice_len];
        let slice = create_slice(obao, chunks, start_index)?;

        let mut decoded = Vec::new();
        let mut decoder = bao::decode::SliceDecoder::new(&*slice, &hash, start_index.try_into().unwrap(), slice_len.try_into().unwrap());
        decoder.read_to_end(&mut decoded)?;
        assert_eq!(&whole_input[start_index as usize..][..slice_len as usize], &*decoded);

        Ok(())
    }
}