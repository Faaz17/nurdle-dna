# ICSIMA2026 Video Recording Checklist

Your screenshot shows the EDAS upload window as available until July 10, 2026. The current date is July 2, 2026, so aim to finish the MP4 a few days early.

## Conference Requirements

- Include paper title, authors, and "ICSIMA2026" at the start.
- Duration: 12 minutes maximum.
- Q&A: still attend the allocated live slot for the 3-minute Q&A.
- Format: MP4.
- File size: 150 MB maximum.
- Dimensions: 16:9 aspect ratio, minimum 720p height.
- Upload location: EDAS.

## Recommended Recording Setup

- Use Zoom recording, as recommended by the conference.
- Use OBS only if Zoom is unavailable or if you want better control of camera plus slides.
- Record at 1280x720 or 1920x1080, 16:9.
- Use a headset or external microphone if possible.
- Close notifications, WhatsApp, Discord, email popups, and browser tabs.
- Put the slide deck in full-screen slideshow mode.
- Keep the first title slide visible for 3-5 seconds before speaking.

## During Recording

- Say the paper title, authors, and "ICSIMA2026" in the first 15 seconds.
- Keep pace around 120-130 words per minute.
- Do not read every slide bullet; explain the slide's main point.
- Leave a 10-20 second buffer under the 12-minute maximum.
- If you make a small speaking mistake, pause briefly and continue. Only restart for major errors.

## After Recording

- Watch the first 30 seconds and last 30 seconds.
- Check that the audio is clear and not clipping.
- Check that the title slide includes ICSIMA2026, paper title, and authors.
- Confirm the file is MP4.
- Confirm the duration is under 12:00.
- Confirm resolution is at least 1280x720.
- Confirm file size is under 150 MB before uploading.

## Compression Target

For a 12-minute MP4 under 150 MB, keep total bitrate below about 1.6 Mbps. A practical target is:

- Video bitrate: 1300k
- Audio bitrate: 96k
- Resolution: 1280x720
- Frame rate: 30 fps
- Codec: H.264 video + AAC audio

If the recording is too large and `ffmpeg` is installed, use:

```bash
ffmpeg -i input.mp4 -c:v libx264 -b:v 1300k -maxrate 1500k -bufsize 3000k -c:a aac -b:a 96k -movflags +faststart ICSIMA2026_NurdleDNA_Backup_Presentation.mp4
```

Suggested final filename:

```text
ICSIMA2026_NurdleDNA_Backup_Presentation_Faaz_Ali_Sayyed.mp4
```
