//! This script should be integrated with AWS lambda oracle. It will need to make a call to the IPFS node to get the chunk of the file,
//! then use that chunk to create a slice (proof). It will then need to send that proof to chain. Blake3 uses 1024 byte chunks, so the
//! chunk size should be 1024, representing a single leaf in the Merkle tree.

#![allow(dead_code, unused)]
use anyhow::Result;
use rand::prelude::*;
use std::fs::File;
use std::io::prelude::*;
use std::io::{Cursor, SeekFrom};

use crate::bao_creator_estuary::create_obao;
mod bao_creator_estuary;

pub(crate) const CHUNK_SIZE: usize = 1024;

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

// Create an outboard encoding of the input file with only the desired chunks, not the whole input file. Utilizes a Fake Seeker that
// tricks the Slice Extractor into not actually seeking, since the Extractor already has the portion of the file it needs. This allows
// us to create a proof only using the desired chunks and the smaller OBAO file. See https://github.com/oconnor663/bao/issues/34

fn create_slice(obao: Vec<u8>, chunks: &[u8], start_index: usize) -> Result<Vec<u8>> {
    let mut extractor2 = bao::encode::SliceExtractor::new_outboard(
        FakeSeeker::new(chunks),
        Cursor::new(&obao[..]),
        start_index.try_into().unwrap(),
        CHUNK_SIZE.try_into().unwrap(),
    );
    let mut slice2 = Vec::new();
    extractor2.read_to_end(&mut slice2)?;
    Ok(slice2)
}

fn main() -> Result<()> {
    unimplemented!();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn obao_slice_random_input_file() -> Result<(), Box<dyn std::error::Error>> {
        let mut whole_input = vec![0u8; 1 << 20];
        rand::thread_rng().fill(&mut whole_input[..]);
        let (obao, _hash) = create_obao(whole_input.clone())?;

        // Use the outboard encoding to extract a slice for a random range the standard way. This
        // requires the whole input file, but it'll only read a single chunk.
        let range = whole_input.len() / CHUNK_SIZE;
        let start_index = rand::thread_rng().gen_range(0..range) * CHUNK_SIZE;
        let mut extractor = bao::encode::SliceExtractor::new_outboard(
            Cursor::new(&whole_input[..]),
            Cursor::new(&obao[..]),
            start_index.try_into().unwrap(),
            CHUNK_SIZE.try_into().unwrap(),
        );
        let mut slice = Vec::new();
        extractor.read_to_end(&mut slice)?;

        // Creating a chunk. This will be done in production by integrating a call to ipfsNode.cat(CID, {offset: start, length: size})
        let chunks = &whole_input[start_index * 1..start_index + CHUNK_SIZE];
        let slice2 = create_slice(obao, chunks, start_index)?;
        // The slice created through the Fake Seeker and only a chunk of the file, and the slice created using the whole file are the same.
        assert_eq!(slice, slice2);
        Ok(())
    }
    #[test]
    fn verify_slice_random_input_file() -> Result<(), Box<dyn std::error::Error>> {
        let mut whole_input = vec![0u8; 1 << 20];
        rand::thread_rng().fill(&mut whole_input[..]);
        let (obao, hash) = create_obao(whole_input.clone())?;

        let range = whole_input.len() / CHUNK_SIZE;
        let start_index = rand::thread_rng().gen_range(0..range) * CHUNK_SIZE;

        let chunks = &whole_input[start_index..start_index + CHUNK_SIZE];
        let slice = create_slice(obao, chunks, start_index)?;

        // Decoding the file on the slice in BAO is the equivalent of running a merkle proof. If the slice is invalid, the decoder will exit
        // with an error.
        let mut decoded = Vec::new();
        let mut decoder = bao::decode::SliceDecoder::new(
            &*slice,
            &hash,
            start_index.try_into().unwrap(),
            CHUNK_SIZE.try_into().unwrap(),
        );
        decoder.read_to_end(&mut decoded)?;
        assert_eq!(
            &whole_input[start_index as usize..][..CHUNK_SIZE as usize],
            &*decoded
        );
        Ok(())
    }

    #[test]
    fn bad_slice() -> Result<(), Box<dyn std::error::Error>> {
        let mut whole_input = vec![0u8; 1 << 20];
        rand::thread_rng().fill(&mut whole_input[..]);
        let (obao, hash) = create_obao(whole_input.clone())?;

        let range = whole_input.len() / CHUNK_SIZE;
        let start_index = rand::thread_rng().gen_range(0..range) * CHUNK_SIZE;
        let chunks = &whole_input[start_index..start_index + CHUNK_SIZE];
        let mut slice = create_slice(obao, chunks, start_index)?;

        // Change the last byte of the slice so the decoder has an error
        let last_index = slice.len() - 1;
        slice[last_index] ^= 1;
        let mut decoder = bao::decode::SliceDecoder::new(
            &*slice,
            &hash,
            start_index.try_into().unwrap(),
            CHUNK_SIZE.try_into().unwrap(),
        );
        let err = decoder.read_to_end(&mut Vec::new()).unwrap_err();
        assert_eq!(std::io::ErrorKind::InvalidData, err.kind());

        Ok(())
    }

    #[test]
    fn verification_local_input_file() -> Result<(), Box<dyn std::error::Error>> {
        let mut f = File::open("ethereum.pdf")?;
        let mut whole_input = Vec::new();
        f.read_to_end(&mut whole_input)?;

        let (obao, hash) = create_obao(whole_input.clone())?;

        let range = whole_input.len() / CHUNK_SIZE;
        let start_index = rand::thread_rng().gen_range(0..range) * CHUNK_SIZE;

        let chunks = &whole_input[start_index..start_index + CHUNK_SIZE];
        let slice = create_slice(obao, chunks, start_index)?;

        let mut decoded = Vec::new();
        let mut decoder = bao::decode::SliceDecoder::new(
            &*slice,
            &hash,
            start_index.try_into().unwrap(),
            CHUNK_SIZE.try_into().unwrap(),
        );
        decoder.read_to_end(&mut decoded)?;
        assert_eq!(
            &whole_input[start_index as usize..][..CHUNK_SIZE as usize],
            &*decoded
        );
        Ok(())
    }
}
