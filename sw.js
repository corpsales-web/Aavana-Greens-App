// --- Login System (Simulated) ---
let isLoggedIn = false;
let currentUser = null;

function sendOtp() {
  const phone = document.getElementById('phoneInput').value;
  if (!phone) {
    alert("Please enter your mobile number");
    return;
  }
  document.getElementById('phoneAuth').style.display = 'none';
  document.getElementById('otpScreen').style.display = 'block';
}

function verifyOtp() {
  document.getElementById('otpScreen').style.display = 'none';
  document.getElementById('setPassword').style.display = 'block';
}

function createAccount() {
  const name = document.getElementById('nameInput').value;
  const password = document.getElementById('passwordInput').value;
  if (!name || !password) {
    alert("Please enter name and password");
    return;
  }
  currentUser = { name: name, phone: "+918209040090", role: "team" };
  document.getElementById('userName').textContent = name;
  showMainApp();
}

function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}

function logout() {
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
}

function showForgotPassword() {
  alert("For phone login, use OTP to re-login. No password reset needed.");
}

// --- Voice Task ---
let mediaRecorder;
let audioChunks = [];

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const mockText = "Assign task to Raj: Visit Mr. Sharma tomorrow at 3 PM. Urgent.";
        document.getElementById('transcript').textContent = mockText;
        createTaskFromVoice(mockText);
      };
      mediaRecorder.start();
      document.getElementById('stopBtn').disabled = false;
    });
}

function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
  document.getElementById('stopBtn').disabled = true;
}

function createTaskFromVoice(text) {
  const taskList = document.createElement('div');
  taskList.innerHTML = `<strong>🎙️ Voice Task:</strong> ${text}`;
  document.querySelector('.voice-section').appendChild(taskList);
  showMandatoryNotification(`New task: ${text.substring(0, 50)}...`);
}

// --- Mandatory Notifications ---
function showMandatoryNotification(message) {
  const popup = document.createElement('div');
  popup.id = 'mandatoryPopup';
  popup.innerHTML = `
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);color:white;display:flex;justify-content:center;align-items:center;z-index:9999;">
      <div style="background:#2d5a27;padding:2rem;border-radius:12px;text-align:center;">
        <h2>❗ MANDATORY</h2>
        <p>${message}</p>
        <button onclick="document.getElementById('mandatoryPopup').remove()" class="btn-primary">✅ Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

// --- Location Tracking ---
function captureLocation() {
  const msg = document.getElementById('locationMsg');
  msg.textContent = "📍 Getting location...";
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      msg.textContent = `✅ Saved: ${lat}, ${lng}`;
    }, () => msg.textContent = "❌ Denied");
  } else {
    msg.textContent = "❌ Not supported";
  }
}

// --- Workflows ---
let workflows = [];

function addWorkflow() {
  const name = prompt("Workflow name:");
  if (!name) return;
  const trigger = prompt("Trigger:");
  const message = prompt("Message:");
  const delay = prompt("Delay (hours):", "24");

  const wf = { id: Date.now(), name, trigger, message, delay: parseInt(delay) };
  workflows.push(wf);
  renderWorkflows();
}

function renderWorkflows() {
  const list = document.getElementById('workflowList');
  if (workflows.length === 0) {
    list.innerHTML = '<p>No workflows yet.</p>';
    return;
  }
  list.innerHTML = '';
  workflows.forEach(wf => {
    const div = document.createElement('div');
    div.className = 'workflow-item';
    div.innerHTML = `
      <strong>${wf.name}</strong>
      <p><small>Trigger: ${wf.trigger}</small></p>
      <p><em>"${wf.message}"</em></p>
      <p>After: ${wf.delay} hours</p>
      <div class="actions">
        <button onclick="editWorkflow(${wf.id})">✏️ Edit</button>
        <button onclick="deleteWorkflow(${wf.id})">🗑️ Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function editWorkflow(id) {
  const wf = workflows.find(w => w.id === id);
  if (!wf) return;
  const name = prompt("Edit name:", wf.name);
  const trigger = prompt("Edit trigger:", wf.trigger);
  const message = prompt("Edit message:", wf.message);
  const delay = prompt("Edit delay:", wf.delay);
  if (name && trigger && message && delay) {
    wf.name = name;
    wf.trigger = trigger;
    wf.message = message;
    wf.delay = parseInt(delay);
    renderWorkflows();
  }
}

function deleteWorkflow(id) {
  if (confirm("Delete?")) {
    workflows = workflows.filter(w => w.id !== id);
    renderWorkflows();
  }
}

// --- AI Lead Filter ---
function startLeadFilter() {
  const ai = document.getElementById('aiResponse');
  ai.innerHTML = `
    <p>🤖: Hi! Which space are you designing?<br>
    1️⃣ Balcony<br>
    2️⃣ Terrace<br>
    3️⃣ Indoor Plants</p>
  `;
  setTimeout(() => {
    ai.innerHTML += `<p>🤖: What’s your budget?<br>1️⃣ Under ₹50K<br>2️⃣ ₹50K–1L<br>3️⃣ Above ₹1L</p>`;
  }, 2000);
}
