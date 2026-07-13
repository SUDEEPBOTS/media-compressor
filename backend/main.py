import os
import uuid
import asyncio
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
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_CONCURRENT_JOBS = 2  # Limit RAM/CPU usage on Railway free tier
FFMPEG_TIMEOUT = 300  # 5 minutes maximum for a compression job

# Semaphore to restrict number of concurrent FFmpeg processes
compression_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

def cleanup_files(*file_paths):
    for path in file_paths:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                print(f"Failed to delete {path}: {e}")

@app.post("/api/compress-video")
async def compress_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # 1. Security: Validate Content-Type
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only videos are allowed.")

    # 2. Security: Validate Extension
    input_ext = os.path.splitext(file.filename)[1].lower()
    if input_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported video format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # 3. Security: Check size by reading into memory (up to 50MB)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")
    
    file_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"{file_id}_in{input_ext}")
    output_path = os.path.join(TEMP_DIR, f"{file_id}_out.mp4")

    # Save to disk
    with open(input_path, "wb") as f:
        f.write(content)

    # 4. Process Video with Semaphore limits & Timeout
    try:
        async with compression_semaphore:
            # We are using async subprocess to NOT block the FastAPI event loop
            cmd = [
                "ffmpeg", "-y", "-i", input_path,
                "-vcodec", "libx264", "-crf", "28", "-preset", "veryfast",
                "-acodec", "aac", "-b:a", "128k",
                output_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                # 5. Security: Timeout to prevent hung processes DoS
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=FFMPEG_TIMEOUT)
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                raise HTTPException(status_code=504, detail="Video compression timed out.")

            if process.returncode != 0:
                print(f"FFmpeg Error: {stderr.decode()}")
                raise Exception("FFmpeg compression failed")

    except Exception as e:
        cleanup_files(input_path, output_path)
        raise HTTPException(status_code=500, detail=str(e))

    # 6. Safe cleanup after response is sent
    background_tasks.add_task(cleanup_files, input_path, output_path)

    return FileResponse(path=output_path, media_type="video/mp4", filename=f"compressed_{file.filename}")

@app.exception_handler(404)
async def custom_404_handler(request, exc):
    dist_path = "../frontend/dist"
    if os.path.exists(dist_path):
        return FileResponse(os.path.join(dist_path, "index.html"))
    return JSONResponse({"error": "Not Found"}, status_code=404)

if os.path.exists("../frontend/dist"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
