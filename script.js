const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");

canvas.width = 640;
canvas.height = 480;

// Request notification permission
Notification.requestPermission();

// Eye landmarks
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

// Alarm settings
const alarmSound = new Audio("alarm.mp3");
alarmSound.loop = true;

let alarmTriggered = false;

// Around 4 seconds at 30 FPS
let closedFrames = 0;
const CLOSED_FRAME_THRESHOLD = 30;

// ----------------------
// Alarm Function
// ----------------------
function triggerAlarm() {

    console.log("ALARM FUNCTION CALLED");

    if (alarmTriggered) return;

    alarmTriggered = true;

    alarmSound.play();

    console.log("PLAY COMMAND SENT");

    statusText.innerText =
        "🚨 DROWSINESS DETECTED 🚨";
}

// ----------------------
// Draw Landmarks
// ----------------------
function drawPoint(x, y) {

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "lime";
    ctx.fill();
}

// ----------------------
// Distance Formula
// ----------------------
function distance(p1, p2) {

    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2)
    );
}

// ----------------------
// EAR Calculation
// ----------------------
function calculateEAR(landmarks, eyeIndices) {

    const p1 = landmarks[eyeIndices[0]];
    const p2 = landmarks[eyeIndices[1]];
    const p3 = landmarks[eyeIndices[2]];
    const p4 = landmarks[eyeIndices[3]];
    const p5 = landmarks[eyeIndices[4]];
    const p6 = landmarks[eyeIndices[5]];

    const vertical1 = distance(p2, p6);
    const vertical2 = distance(p3, p5);
    const horizontal = distance(p1, p4);

    return (vertical1 + vertical2) / (2 * horizontal);
}

// ----------------------
// FaceMesh Setup
// ----------------------
const faceMesh = new FaceMesh({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// ----------------------
// Detection Logic
// ----------------------
faceMesh.onResults((results) => {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
        results.image,
        0,
        0,
        canvas.width,
        canvas.height
    );

    if (results.multiFaceLandmarks.length > 0) {

        const landmarks =
            results.multiFaceLandmarks[0];

        landmarks.forEach(point => {

            drawPoint(
                point.x * canvas.width,
                point.y * canvas.height
            );

        });

        const leftEAR =
            calculateEAR(
                landmarks,
                LEFT_EYE
            );

        const rightEAR =
            calculateEAR(
                landmarks,
                RIGHT_EYE
            );

        const ear =
            (leftEAR + rightEAR) / 2;

        console.log(
            "EAR:",
            ear.toFixed(3)
        );

        // Threshold
        if (ear < 0.25) {

            closedFrames++;

            statusText.innerText =
                "😴 Eyes Closed | EAR: " +
                ear.toFixed(3);

        } else {

            closedFrames = 0;

            statusText.innerText =
                "😊 Eyes Open | EAR: " +
                ear.toFixed(3);

            alarmTriggered = false;

            alarmSound.pause();
            alarmSound.currentTime = 0;
        }

        if (
            closedFrames >
            CLOSED_FRAME_THRESHOLD
        ) {

            triggerAlarm();
        }

    } else {

        statusText.innerText =
            "No Face Detected";

        closedFrames = 0;
    }
});

// ----------------------
// Start Camera
// ----------------------
async function startCamera() {

    const stream =
        await navigator.mediaDevices.getUserMedia({
            video: true
        });

    video.srcObject = stream;

    video.onloadedmetadata = () => {

        video.play();

        const camera =
            new Camera(video, {

                onFrame: async () => {

                    await faceMesh.send({
                        image: video
                    });

                },

                width: 640,
                height: 480
            });

        camera.start();
    };
}

startCamera();