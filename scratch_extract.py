import fitz
import os

pdf_path = r"C:\Users\Win-11\.gemini\antigravity\brain\b97396e8-7250-4bbc-9fdc-a76b111ede11\.user_uploaded\media_1794899588937_07762832.pdf"
doc = fitz.open(pdf_path)
print("Total pages:", len(doc))

out_dir = r"public\hpc\extracted"
os.makedirs(out_dir, exist_ok=True)

for i in range(min(4, len(doc))):
    page = doc[i]
    images = page.get_images()
    print(f"Page {i+1} has {len(images)} images")
    for j, img in enumerate(images):
        xref = img[0]
        base_img = doc.extract_image(xref)
        ext = base_img["ext"]
        w = base_img["width"]
        h = base_img["height"]
        print(f"   Image {j}: xref {xref}, format {ext}, {w}x{h}")
        # Save image
        img_filename = f"page_{i+1}_img_{j}_{w}x{h}.{ext}"
        with open(os.path.join(out_dir, img_filename), "wb") as f:
            f.write(base_img["image"])

# Also render pages 1, 2, 3 as high-res images for reference or background use
for i in [0, 1, 2]:
    page = doc[i]
    pix = page.get_pixmap(dpi=200)
    pix.save(os.path.join(out_dir, f"page_{i+1}_rendered.png"))
    print(f"Rendered page {i+1} at 200dpi")
