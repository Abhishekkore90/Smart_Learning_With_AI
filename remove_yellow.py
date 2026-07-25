import fitz
import re
import sys

def remove_yellow(input_path, output_path):
    doc = fitz.open(input_path)
    for page in doc:
        xrefs = page.get_contents()
        for xref in xrefs:
            stream = doc.xref_stream(xref)
            if b'1 1 0 rg' in stream:
                new_stream = stream.replace(b'1 1 0 rg', b'1 1 1 rg')
                doc.update_stream(xref, new_stream)
            # also handle any other yellow in RGB if any
            if b'1.0 1.0 0.0 rg' in stream:
                new_stream = stream.replace(b'1.0 1.0 0.0 rg', b'1 1 1 rg')
                doc.update_stream(xref, new_stream)
    doc.save(output_path)
    print(f"Saved modified PDF to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        remove_yellow(sys.argv[1], sys.argv[2])
