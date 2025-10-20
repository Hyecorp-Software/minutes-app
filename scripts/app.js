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
const DROPBOX_TOKEN = 'sl.u.AGB8evLhTWzb43YNN2f1Ia5wFqSmWY460WM7yV2CZ9XXPc_kSetRdadWpNY3XFQMaEwMB99GWMy0AwrouOzwgnebdBAbylVwl_JSPW5MFOELpe2GP1xiXPQSK5Y2BRWBKUUoAn_biJlaREq3IY5gsYYM--ONgxiKQ_fYODVk5vmSKt5F6e7_7cYoGRb6VyUJx4D7hZfG-ODz1w7xnZkfSbkx2ZFzjXS07miJ6LHL-mxSEHhNqXqwSbGlTD83RWkilWgqFDRPEt5VelVSX-RozITbmRWCmuJv-O70jxnGx6PBO163bxJmpnbT4I2quVaxlchLOfB56QAG8TYUdt7xk_XgbWkByDB3gqMUQL2uMy5p5z378vrpvFIIbjaPPpV87RbmfZX_RGx-xiY9JNrMDiZeXNqndlF5jIPz9dS-1VBALtF6ADAnuA-SnAB_xH_XGDXbHjgtVLdKh_lNd9vN21CDnPzL3yC23Sa6JM7mt2MxEOvqQrZHRo8Y7SuIFIDhCHbV3bwkBBLek9x8jACEYe0LuiryUdXf5mHWGIXnu262HnCIsqmu3hqy1soRoTZ8u56qErsQ5HOmFTzslxoUHFk7MeNId63Jr-fsNvfU4U1DKrcvqs4yvvhY36dqVGxHoKfz1ZSsfLTHxTjK0ntprkIp8QTqao0cQgWSdGUuOpytE05--00-vcAGl6R1ILIIc-qUjpRqI8orLDOYNVwfYJY0VwcovGxOxeZuIapHmpheFD5aEr11kEUMKAtxY4IZhGWZGC7DqyJ3_MNGkNA595_QWv_t8UoAN6oF8d15ZULuVDEj8F26SUpV6h3oLg6lR5TG6sqBK4Ip81xjW9pYcOZRc2pBMS3-aPwVc1Dh7I4dyLbCh1D8mQHseygRfQXJmcGu66iVTxmnF2CFxicXY5A-TNmaR_eAuY8b3Et0Wb2Sw0BfhpcAeR6_rySa2FSyiGanfpbs5dkygAEtcjs_ITbYEREJ5kG5J14ADXZ04ddKl9KBnADcaG-7YRa5sC3gj2RubSAGot0txU0H6fER1Gl43WMVq686Y5Cc-YQcAcJWDHwtoAsOmdZAP4U1mTzlkACSbXwmSPygMBGYkGXE-S6qkkaaM_k3VhdiiGYlX7XxCpdn31vaQZCCDymmUf7-5VcXrJuQXSnZdxjLcIHOdmvK3lgiX2hRYH-7ZcZiPuOLN3yUfMBxPoRd7LbpbY1ejv1BqLzyJ3ysGtP0oHPtTtd6N2eXAPD65m799XBiC983P6_EwIXvxWATDcOEZVmm0rUY8r3ntXK5TF6ZRPjEgtkbExI0HQdZXaEIkI9WVCf_V6qEvPPWjoEExft88u_deu4';
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
      const linkRes = await dbx.sharingCreateSharedLinkWithSettings({
        path: uploadRes.result.path_lower
      });
      const directLink = linkRes.result.url.replace('?dl=0','?dl=1');

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


