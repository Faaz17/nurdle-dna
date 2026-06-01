# Jetson Start

Setup notes and pointers for getting the **NVIDIA Jetson Orin Nano** running on the NurdleDNA vision pipeline.

## SD-card image — not in this repo

The Jetson Orin Nano boots from a microSD card flashed with NVIDIA's official JetPack image. The image itself (~11 GB unzipped) is too large to commit to GitHub.

**Download the image directly from NVIDIA:**

- JetPack 6.1 (rev 1) for Jetson Orin Nano Developer Kit — <https://developer.nvidia.com/embedded/jetpack>
- Look for `jp61-rev1-orin-nano-sd-card-image.zip` (or the latest revision NVIDIA has posted).
- File expected by the team's flashing notes: `jp61-rev1-orin-nano-sd-card-image.zip`.

After downloading, unzip and flash to a 64 GB+ microSD card using **Balena Etcher** or **Raspberry Pi Imager** (both treat the JetPack `.img` like any other OS image).

## First boot — quick checklist

1. Insert flashed microSD into the Orin Nano, connect HDMI + keyboard + mouse, power on.
2. Step through the Ubuntu first-boot wizard (locale, user, network).
3. Confirm JetPack components installed:  `sudo apt list --installed | grep -i nvidia`.
4. Verify the camera (CSI or USB) enumerates:  `ls /dev/video*`.
5. Test CUDA:  `nvidia-smi` (or `tegrastats` on Jetson).
6. Clone the NurdleDNA repo and follow `/jetson/README.md` for the vision-pipeline service.
