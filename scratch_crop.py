from PIL import Image

im = Image.open(r"public\hpc\extracted\page_1_rendered.png")
w, h = im.size
print(f"Rendered size: {w}x{h}")

# The 3 logos are in the upper area (around y = 15% to 35%)
# Let's crop the logo band:
# Page 1 top has "STARS प्रकल्पांतर्गत" and then the 3 logos
logos_crop = im.crop((int(w * 0.10), int(h * 0.13), int(w * 0.90), int(h * 0.28)))
logos_crop.save(r"public\hpc\foundational_cover_logos.png")
print("Saved foundational_cover_logos.png")

# Also copy page_1_img_0_845x546.jpeg to public/hpc/foundational_cover_kids.jpeg
kids_img = Image.open(r"public\hpc\extracted\page_1_img_0_845x546.jpeg")
kids_img.save(r"public\hpc\foundational_cover_kids.jpeg")
print("Saved foundational_cover_kids.jpeg")
