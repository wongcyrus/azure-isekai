import os

# Directories to scan
image_dirs = ["img"]
audio_dirs = ["audio/bgm", "audio/bgs", "audio/me", "audio/se"]

# File extensions to check
image_exts = [".png", ".jpg", ".jpeg", ".gif", ".webp"]
audio_exts = [".ogg", ".mp3", ".wav", ".m4a"]

def gather_files(dirs, exts):
    files = []
    for dir in dirs:
        for root, _, fs in os.walk(dir):
            for f in fs:
                if any(f.lower().endswith(ext) for ext in exts):
                    files.append(os.path.join(root, f))
    return files

# Gather all files
image_files = gather_files(image_dirs, image_exts)
audio_files = gather_files(audio_dirs, audio_exts)

# Gather all project files to search for references
project_files = []
for root, _, files in os.walk("."):
    for f in files:
        if f.endswith(('.js', '.json', '.txt', '.html', '.css')):
            project_files.append(os.path.join(root, f))

def find_unused(files):
    used = set()
    for file in files:
        name = os.path.basename(file)
        for pf in project_files:
            with open(pf, "r", encoding="utf-8", errors="ignore") as f:
                if name in f.read():
                    used.add(file)
                    break
    return set(files) - used

unused_images = find_unused(image_files)
unused_audio = find_unused(audio_files)

for img in sorted(unused_images):
    try:
        os.remove(img)
        print(f"Removed unused image: {img}")
    except Exception as e:
        print(f"Failed to remove {img}: {e}")

for aud in sorted(unused_audio):
    try:
        os.remove(aud)
        print(f"Removed unused audio: {aud}")
    except Exception as e:
        print(f"Failed to remove {aud}: {e}")