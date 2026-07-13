# Media Compressor Pro 🎥🖼️

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)

A premium, fast, and secure media compressor built with React and FastAPI. 
- **Images:** Compressed purely in the browser (client-side) for absolute privacy and zero server cost.
- **Videos:** Securely uploaded and compressed via a fast FFmpeg backend, with strict size limits and auto-cleanup to prevent server bloat.

**Topics / Tags:** `#media-compressor` `#video-compressor` `#image-compressor` `#fastapi` `#react` `#ffmpeg` `#glassmorphism` `#vite`

## Features ✨

- **Glassmorphic UI:** A beautifully designed dark theme using Framer Motion and Lucide Icons.
- **Client-Side Image Compression:** Zero quality loss, instant compression directly in the browser.
- **Backend Video Compression:** Safe and fast MP4 compression using `ffmpeg` and `FastAPI`.
- **Security Built-In:** 50MB file size limit, strict MIME-type checking, and background cleanup tasks to delete temporary files instantly.

## Quick Deploy 🚄

Host it yourself instantly on Railway! The included Dockerfile natively builds the React frontend and deploys the FastAPI backend with FFmpeg.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

## Security Architecture 🔒
- **Image Privacy:** Images never leave the user's browser.
- **Video Safety:** Videos are saved temporarily using secure UUIDs, compressed, sent back, and then **immediately deleted** via FastAPI BackgroundTasks.
- **Rate Limits & Sizing:** Hardcoded to reject videos larger than 50MB.

## Local Development 💻

### Backend (Python)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Ensure FFmpeg is installed on your OS!
uvicorn main:app --reload --port 8000
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## Contributing 🤝
Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md).

## License 📜
MIT License - see the [LICENSE](LICENSE) file for details.
