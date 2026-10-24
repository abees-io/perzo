# NVIDIA Video Super Resolution setup

## What is included now

Perzo includes a **Video Super Resolution** entry in the model picker, a local video preview, output-resolution/quality controls, and an attachment menu. It does not upload videos, run VSR inference, or produce enhanced downloads in this release. The **Setup required** label and disabled upscale button reflect this state.

Use the plus button to choose **Upscale a video**, or select the tool in the model picker. MP4, MOV and WebM files up to 100 MB can be selected for local preview. Browser playback depends on the video codec. This preview limit is an app choice, not a statement about NVIDIA's server limits.

## Deploy the processing service

VSR is separate from NVIDIA's chat-completions API. A chat API key and a Vercel deployment alone do not provide this service.

1. Obtain NGC access to the VSR NIM release and provision a supported GPU host. NVIDIA's 1.0.10 documentation specifies an Ada-generation-or-later NVIDIA GPU, compatible NVENC/NVDEC, driver 590.33+, CUDA 13.1+, Docker, and NVIDIA Container Toolkit. Check the current [support matrix](https://docs.nvidia.com/nim/maxine/vsr/latest/streaming/support-matrix.html) before provisioning.
2. Follow the [compressed-video deployment guide](https://docs.nvidia.com/nim/maxine/vsr/latest/streaming/getting-started.html) to authenticate to NGC, pull `nvcr.io/nim/nvidia/vsr-nim:1.0.10`, launch the container, and verify `/v1/health/ready` on its HTTP control port. Inference uses gRPC on port 8001; the HTTP health port is not an inference API.
3. Download NVIDIA's compressed-video quickstart package and test its reference client. For the sample gRPC workflow, MP4 video is converted to an H.264 Annex B stream before processing. Follow the [inference guide](https://docs.nvidia.com/nim/maxine/vsr/latest/streaming/running-inference.html).

## Connect Perzo after deployment

These integration steps are still to be implemented once a VSR service is available:

- Add authenticated video uploads to object storage and a processing-job API. The browser should upload directly to storage for larger files, rather than proxy large videos through Perzo's chat endpoint.
- Run a worker near the GPU service. Use NVIDIA's released protocol definitions for `nvidia.video_processing.v1beta1.VideoSuperResolutionService/ProcessVideo`; do not send a VSR model ID to `/v1/chat/completions`.
- Translate the selected output dimensions and quality preset into the VSR request configuration. Validate the source codec, dimensions, and supported scale ratio; the documented maximum is 4× per dimension.
- Return job status and a signed output URL. Add progress, cancellation, playback and download once real output is available.
- Keep credentials and service endpoints in the worker/server configuration. Do not expose them in the browser or commit keys to Git.

No VSR environment variable is active in Perzo yet. Adding an arbitrary endpoint to `.env.local` will not connect it; the inference gateway/client must be implemented first. Existing NVIDIA chat models continue to work independently.
