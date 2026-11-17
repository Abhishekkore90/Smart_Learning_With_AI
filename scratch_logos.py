from PIL import Image

im = Image.open(r"public\hpc\extracted\page_1_rendered.png")
w, h = im.size

# Page 1 rendered is 1654 x 2205
# Let's inspect coordinates for the 3 logos on page 1:
# Left logo: NCERT/PARAKH: x from 0.10 to 0.32, y from 0.16 to 0.28
# Middle logo: Maharashtra Shasan: x from 0.40 to 0.60, y from 0.14 to 0.26
# Right logo: SCERT Pune: x from 0.68 to 0.90, y from 0.16 to 0.28

ncert = im.crop((int(w * 0.10), int(h * 0.16), int(w * 0.32), int(h * 0.28)))
ncert.save(r"public\hpc\ncert_parakh_logo.png")

maha = im.crop((int(w * 0.40), int(h * 0.14), int(w * 0.60), int(h * 0.26)))
maha.save(r"public\hpc\maharashtra_seal_logo.png")

scert = im.crop((int(w * 0.68), int(h * 0.16), int(w * 0.90), int(h * 0.28)))
scert.save(r"public\hpc\scert_pune_logo.png")

print("Individual logos saved successfully!")
