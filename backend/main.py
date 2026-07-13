import os
import uuid
import subprocess
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def cleanup_files(input_path: str, output_path: str):
    if os.path.exists(input_path):
        os.remove(input_path)
    if os.path.exists(output_path):
        os.remove(output_path)

@app.post("/api/compress-video")
async def compress_video(background_tasks: BackgroundTasks, request: Request, file: UploadFile = File(...)):
    # Security: Validate Content-Type
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only videos are allowed.")

    # Security: Read file and check size limits
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")
    
    file_id = str(uuid.uuid4())
    input_ext = os.path.splitext(file.filename)[1] or ".mp4"
    input_path = os.path.join(TEMP_DIR, f"{file_id}_in{input_ext}")
    output_path = os.path.join(TEMP_DIR, f"{file_id}_out.mp4")

    with open(input_path, "wb") as f:
        f.write(content)

    # Compress using FFmpeg (libx264, preset veryfast, crf 28)
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-vcodec", "libx264", "-crf", "28", "-preset", "veryfast",
        "-acodec", "aac", "-b:a", "128k",
        output_path
    ]
    
    try:
        process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0:
            raise Exception("FFmpeg compression failed")
    except Exception as e:
        cleanup_files(input_path, output_path)
        raise HTTPException(status_code=500, detail="Error during video compression")

    background_tasks.add_task(cleanup_files, input_path, output_path)

    # Add custom headers to let frontend know original vs new size
    # But FileResponse doesn't easily let us send custom JSON with the file
    # We will just return the file.
    return FileResponse(path=output_path, media_type="video/mp4", filename=f"compressed_{file.filename}")

# Serve the React SPA fallback
@app.exception_handler(404)
async def custom_404_handler(request, exc):
    dist_path = "../frontend/dist"
    if os.path.exists(dist_path):
        return FileResponse(os.path.join(dist_path, "index.html"))
    return JSONResponse({"error": "Not Found"}, status_code=404)

# Mount the static files
if os.path.exists("../frontend/dist"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
