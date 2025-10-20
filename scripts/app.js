// =====================
// Hyecorp Meeting Recorder
// =====================

let mediaRecorder;
let audioChunks = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const emailInput = document.getElementById('email');
const waveform = document.getElementById('waveform');

// ---------------------
// DROPBOX SETTINGS
// ---------------------
// Use App Folder token only. Safe for testing/internal use.
const DROPBOX_TOKEN = 'sl.u.AGDN-q_V_vwaSAY8F-Bdj3ZfVVTHf645RHxI4wI4kSgddMoi_ITLC7i5TLVqRb-wUCF5VLr3pawEmDyqp01acg9LRrDj2DBTkg7I-Wc8H6eDKxOLuhio-UUyUKZGYy85iq1Fz-X23qgEY_1FjkwUxDUVpglrwaLxwKbJD55T5S7ib57WR1w0n5osk-8kIuk9MAx6RFnBj09-M0CvT5G0UvHMfdhyUIigCgxNsOyMnPrCeHQMtToa6kCgA2Wm0EWO1KIVUd45ECNTS92OtyZrwDZJVkzzGni2id2E6i2hjBHLwyzxsbo_X78ic3oq6Deqg_qENwcmaeJAJ3sw8P42ZnanqhZH3b5aimJuPIk-iWCQ6OY6DYLrg_GxMi-MIuOsc15r8Q3VR8h9Eee-Zj5Tvzepze2FZUaQBOZGasW2bhrsqqpe9qDBU9PvAkakYkHS893FcU4HMrKoBpoNUiNFu_XwP8Oa2B2IHsAj-4yq1vgmppoJmdFRjYlrqS_5TVng7tnH0Rk3yUMHgXcTqw27bWCT-4fIl7LeI1fD5eO8mzM9AWLWhHJ5l-4lfPfWG_PmJu2q1g1sxeptGIRv06Qm5F5qeNZn5CLKlR8IZArbOWz5AEdm5pt6YNS8AU8QK4rCq9JXQLzj_ZHRze8698n5_YtcYnS7Teb5HZVkmxb4ECyp84U8sjNiOU9YzNH9SJ7-udd9Uix87drbIh74TzdNs5G5RKJP4a6Du1QdxNxvh-10qtylu_xmjjXqmAJ_7TmUp7ZLNrnnjsH2FSK73tW823eIkkEcZjRwD5Za-PB6PaHycQGTZr5UlCqMmKcUR4mc6U5kPtqfMp7QQKSywRCcbzKLKd8bvN39qYsFk-en7cPowxR2xeCLjxLA7XCQJ6z9425lvMAMTf36L51v0yB1gC6nstL2uAuTGq_MGg0R1ChFOztX8KHEuV9SS8lG7xNZ61M73Chaw--G90ePlLzLzfoFKB-6QsHiNkOjBX2KjwonN8uJCbQU-gCUZG9BsrhStCsYCvjhf4bPz1Rp6gkuzU1UiFY_SMgSnvA315OJ5tpM61csMBb-pjBJNZ3vtGuNHH5BZGQYUtPl-qZnddBi7jJEGwS_Onj5teP5_me8wfZI0vHDuuLtS9Kxp4dTmcNULzg4tGJ9ZBLP8c_NAecdUjZxEYoZ3z-FXr9zHTQduU2S_h86bVNM-AKzD204t9kpGQs1PaxdVe7Yyolq7CkWYBad0JLnN3BUGFc3hIjjPacdy_a-0HD4MDj6UpXBnh51EGx3bPXPyeZc1qeFc0TWfsouHCRmzYrUYR7l2Zw5QEQUvmiAeW5oHDNYqcHMHX_rrvM';
const dbx = new Dropbox.Dropbox({ accessToken: DROPBOX_TOKEN });

// ---------------------
// N8N WEBHOOK
// ---------------------
const N8N_WEBHOOK = 'https://n8n.gamelabs.com.au/webhook/03eaf6f2-9080-4e4a-8276-416a161242e2';

// ======================
// START RECORDING
// ======================
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

    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
    mediaRecorder.start();

    // UI
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

// ======================
// STOP RECORDING
// ======================
stopBtn.addEventListener('click', async () => {
  if (!mediaRecorder) return;

  mediaRecorder.stop();

  // UI
  stopBtn.disabled = true;
  startBtn.classList.remove('recording');
  waveform.classList.remove('active');
  status.textContent = 'Processing';
  status.className = 'processing dots';

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    try {
      // -------------------------
      // 1. Upload to Dropbox
      // -------------------------
      const fileName = `meeting_${Date.now()}.webm`;
      const uploadRes = await dbx.filesUpload({
        path: `/${fileName}`,
        contents: audioBlob
      });

      // -------------------------
      // 2. Get direct download link
      // -------------------------

      const tempLinkRes = await dbx.filesGetTemporaryLink({
      path: uploadRes.result.path_lower
      });
      const directLink = tempLinkRes.result.link;
 
      // -------------------------
      // 3. Trigger n8n webhook
      // -------------------------
      const email = emailInput.value.trim();
      const webhookRes = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: `MEETING_${Date.now()}`,
          email,
          audio_url: directLink
        })
      });

      if (!webhookRes.ok) {
        alert('Webhook failed. Status: ' + webhookRes.status);
        status.textContent = 'Upload failed';
        status.className = 'danger';
      } else {
        status.textContent = 'Uploaded & webhook triggered!';
        status.className = 'uploaded';
      }

      // Optional: delete from Dropbox after n8n processes
      // await dbx.filesDeleteV2({ path: uploadRes.result.path_lower });

      startBtn.disabled = false;

    } catch (err) {
      console.error(err);
      alert('Error uploading to Dropbox or triggering webhook: ' + err);
      startBtn.disabled = false;
      status.textContent = 'Upload failed';
      status.className = 'danger';
    }
  };
});




