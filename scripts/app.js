let mediaRecorder;
let audioChunks = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const emailInput = document.getElementById('email');

// Start recording
startBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) {
    alert('Please enter your email.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.textContent = 'Recording...';
  } catch (err) {
    alert('Could not access microphone: ' + err);
  }
});

// Stop recording
stopBtn.addEventListener('click', async () => {
  if (!mediaRecorder) return;

  mediaRecorder.stop();
  stopBtn.disabled = true;
  status.textContent = 'Processing...';

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    audioChunks = [];

    await uploadAudio(audioBlob, emailInput.value.trim());
    status.textContent = 'Audio uploaded!';
    startBtn.disabled = false;
  };
});

// Upload audio to n8n
async function uploadAudio(blob, email) {
  const formData = new FormData();
  formData.append('file', blob, 'meeting.wav');
  formData.append('email', email);

  // Replace this with your n8n webhook URL
  const webhookUrl = 'https://hyecorp.app.n8n.cloud/webhook/c2b53327-c3b2-40ee-b92a-87220d3878f1';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      alert('Upload failed. Status: ' + response.status);
    }
  } catch (err) {
    alert('Upload error: ' + err);
  }
}
