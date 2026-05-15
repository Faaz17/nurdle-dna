# NurdleDNA — Presentations

Marp Markdown decks for ECTE 250 deliverables.

## Files

| File | Deliverable | Length |
|---|---|---|
| `D7_slides.md` | D7 Final Presentation | 7 min · 8 slides |

## Live preview (recommended)

1. Install **Marp for VS Code** extension (`marp-team.marp-vscode`)
2. Open `D7_slides.md` in VS Code
3. Click the preview icon in the top-right
4. Live edits show instantly in the side panel

## Export to PowerPoint

```bash
cd Presentations
npx -y @marp-team/marp-cli@latest D7_slides.md --pptx -o D7_slides.pptx
```

Open `D7_slides.pptx` in PowerPoint, Keynote, or LibreOffice Impress.

## Export to PDF

```bash
npx -y @marp-team/marp-cli@latest D7_slides.md --pdf -o D7_slides.pdf
```

## Adding images

Drop PNG/JPG files into `images/` (e.g. `images/slide5-camera.png`), then
replace the corresponding `<!-- TODO image: ... -->` comment in the slide
with:

```markdown
![bg right contain](./images/slide5-camera.png)
```

Marp directives:
- `bg` — background image
- `bg right` / `bg left` — half-screen image on one side
- `contain` / `cover` — fit mode
- `w:300px` / `h:200px` — explicit sizing

## Pre-presentation checklist

- [ ] All `TODO image` placeholders replaced with real screenshots
- [ ] Live demo URL loads (`faaz17.github.io/nurdle-dna/live-demo.html`)
- [ ] Jetson is powered, on Wi-Fi, running `python3 main.py`
- [ ] Camera plugged in, pellets/paper props ready for slide 6
- [ ] Backup: pre-recorded GIF of the demo in `images/` in case the
      live setup fails on the day
- [ ] Stopwatch test: full read-through lands between **6:30 and 7:00**
