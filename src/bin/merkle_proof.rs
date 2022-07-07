
use rand::prelude::*;
use std::io::prelude::*;
use std::io::{Cursor, SeekFrom};
use std::fs::File;

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

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1 MiB of random bytes
    let mut whole_input = vec![0u8; 1 << 20];
    rand::thread_rng().fill(&mut whole_input[..]);

    // Create an outboard encoding.
    let mut obao = Vec::new();
    let mut encoder = bao::encode::Encoder::new_outboard(Cursor::new(&mut obao));
    encoder.write_all(&whole_input)?;
    encoder.finalize()?;

    // Use the outboard encoding to extract a slice for the range 2047..2049 the usual way. This
    // requires the whole input file, but it'll only read the second and third chunks.
    let mut extractor = bao::encode::SliceExtractor::new_outboard(
        Cursor::new(&whole_input[..]),
        Cursor::new(&obao[..]),
        2047,
        2,
    );
    let mut slice = Vec::new();
    extractor.read_to_end(&mut slice)?;

    // Now do the same thing, but this time supply only the second and third chunks of input. Note
    // that we need both those chunks whole, even though the target range of the slice is just a
    // couple bytes. To make this work, use a wrapper type that implements seeking as a no-op.
    let two_chunks = &whole_input[1024 * 1..1024 * 3];
    let mut extractor2 = bao::encode::SliceExtractor::new_outboard(
        FakeSeeker::new(two_chunks),
        Cursor::new(&obao[..]),
        2047,
        2,
    );
    let mut slice2 = Vec::new();
    extractor2.read_to_end(&mut slice2)?;

    // Check that we got exactly the same slice.
    assert_eq!(slice, slice2);
    let mut file = File::create("bao_slice.txt").unwrap();
    write!(file,"{:?}", &slice2);

    Ok(())
}