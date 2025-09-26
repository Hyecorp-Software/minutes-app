let mediaRecorder;
let audioChunks = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const emailInput = document.getElementById('email');
const waveform = document.getElementById('waveform'); // Make sure you have waveform div in HTML

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
    audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start();

    // Update UI
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.textContent = 'Recording';
    status.className = 'recording';
    startBtn.classList.add('recording');
    waveform.classList.add('active');

  } catch (err) {
    alert('Could not access microphone: ' + err);
  }
});

// Stop recording
stopBtn.addEventListener('click', async () => {
  if (!mediaRecorder) return;

  mediaRecorder.stop();

  // Update UI
  stopBtn.disabled = true;
  startBtn.classList.remove('recording');
  waveform.classList.remove('active');
  status.textContent = 'Processing';
  status.className = 'processing dots';

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    await uploadAudio(audioBlob, emailInput.value.trim());

    // Update UI to uploaded
    status.textContent = 'Uploaded successfully!';
    status.className = 'uploaded';
    startBtn.disabled = false;
  };
});

// Upload audio to n8n
async function uploadAudio(blob, email) {
  const formData = new FormData();
  formData.append('file', blob, 'meeting.webm');
  formData.append('email', email);

  const webhookUrl = 'https://n8n.gamelabs.com.au/webhook/03eaf6f2-9080-4e4a-8276-416a161242e2';

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
