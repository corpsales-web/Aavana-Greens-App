// Firebase Config - Replace with your real config
const firebaseConfig = {
  apiKey: "AIzaSyBNKKq2LoXdTaIniHKPaQKvnY8nehu62E4",
  authDomain: "aavanagreens-app.firebaseapp.com",
  projectId: "aavanagreens-app",
  storageBucket: "aavanagreens-app.firebasestorage.app",
  messagingSenderId: "304956433136",
  appId: "1:304956433136:web:efbcb242d2e842f690d835"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');

// Check Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    db.collection('users').doc(user.uid).get().then(doc => {
      const data = doc.data();
      userName.textContent = data.name;
      userRole.textContent = data.role || "Team Member";
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
    });
  } else {
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'block';
  }
});

// Send OTP
function sendOtp() {
  const phoneInput = document.getElementById('phoneInput').value;
  if (!phoneInput || phoneInput.length !== 10 || !/^[6-9]\d{9}$/.test(phoneInput)) {
    alert("Please enter a valid 10-digit Indian mobile number");
    return;
  }

  const fullNumber = "+91" + phoneInput;

  // Create reCAPTCHA verifier
  const appVerifier = new firebase.auth.RecaptchaVerifier('phoneAuth', {
    'size': 'invisible',
    'callback': function(response) {
      // reCAPTCHA solved, proceed with OTP
    }
  });

  // Send OTP
  auth.signInWithPhoneNumber(fullNumber, appVerifier)
    .then(confirmationResult => {
      window.confirmationResult = confirmationResult;
      document.getElementById('phoneInputSection').style.display = 'none';
      document.getElementById('otpScreen').style.display = 'block';
    })
    .catch(error => {
      alert("Error sending OTP: " + error.message);
    });
}

// Verify OTP
function verifyOtp() {
  const otpInput = document.getElementById('otpInput').value;
  if (!otpInput) {
    alert("Please enter OTP");
    return;
  }

  window.confirmationResult.confirm(otpInput)
    .then(result => {
      document.getElementById('otpScreen').style.display = 'none';
      document.getElementById('setPassword').style.display = 'block';
    })
    .catch(error => {
      alert("Invalid OTP: " + error.message);
    });
}

// Create Account
function createAccount() {
  const name = document.getElementById('nameInput').value;
  const password = document.getElementById('passwordInput').value;
  const user = auth.currentUser;

  if (!name || !password) {
    alert("Please enter name and password");
    return;
  }

  db.collection('users').doc(user.uid).set({
    name: name,
    phone: user.phoneNumber,
    role: "pending",
    createdAt: new Date()
  }).then(() => {
    document.getElementById('setPassword').style.display = 'none';
    document.getElementById('permissionScreen').style.display = 'block';
  }).catch(err => {
    alert("Error saving user: " + err.message);
  });
}

// Save Permissions
function savePermissions() {
  const hasNotify = document.getElementById('notifyPerm').checked;
  const hasMic = document.getElementById('micPerm').checked;
  const hasLocation = document.getElementById('locationPerm').checked;
  const hasCalendar = document.getElementById('calendarPerm').checked;
  const hasCamera = document.getElementById('cameraPerm').checked;

  if (!hasNotify) {
    alert("🔔 Notifications are mandatory to use this app.");
    return;
  }

  db.collection('users').doc(auth.currentUser.uid).update({
    permissions: {
      notifications: true,
      microphone: hasMic,
      location: hasLocation,
      calendar: hasCalendar,
      camera: hasCamera
    }
  }).then(() => {
    if (hasCalendar) syncCalendar(auth.currentUser.uid);
    alert("All set! Welcome to Aavana Greens.");
    location.reload();
  });
}

// Sync Calendar
function syncCalendar(userId) {
  if (navigator.userAgent.includes("Android")) {
    window.open("https://calendar.google.com", "_blank");
    db.collection('users').doc(userId).update({
      calendarSync: true,
      calendarSyncAt: new Date()
    });
  }
}

// Logout
function logout() {
  auth.signOut();
}

// Toggle Theme
function toggleTheme() {
  const body = document.body;
  const theme = body.classList.contains('dark-theme') ? 'light' : 'dark';
  body.className = theme + '-theme';
  localStorage.setItem('theme', theme);
}

// Load Theme
window.onload = function () {
  const saved = localStorage.getItem('theme') || 'light';
  document.body.className = saved + '-theme';
};

// --- Voice Task ---
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

function toggleRecording() {
  const button = document.getElementById('recordButton');
  const icon = document.getElementById('icon');
  const label = document.getElementById('label');
  const waveform = document.getElementById('waveform');

  if (!isRecording) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
          setTimeout(() => {
            const mockText = "Assign task to Raj: Visit Mr. Sharma tomorrow at 3 PM. Urgent.";
            document.getElementById('transcript').textContent = mockText;
            createTaskFromVoice(mockText);
          }, 1500);
        };

        mediaRecorder.start();
        isRecording = true;
        icon.textContent = "🟢";
        label.textContent = "Recording...";
        waveform.style.display = "block";
        button.style.color = "var(--primary)";
      })
      .catch(err => {
        alert("Microphone access denied. Please allow it.");
      });
  } else {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    isRecording = false;
    icon.textContent = "🔴";
    label.textContent = "Start Recording";
    waveform.style.display = "none";
    button.style.color = "";
  }
}

function createTaskFromVoice(text) {
  const taskList = document.getElementById('taskList');
  const div = document.createElement('div');
  div.className = 'task-item';
  div.innerHTML = `<strong>🎙️ Voice Task:</strong> ${text}`;
  taskList.insertBefore(div, taskList.firstChild);
  showMandatoryNotification(`New task: ${text.substring(0, 50)}...`);
}

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

// --- Location ---
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

// --- Leads ---
let leads = [];

function addLead() {
  const name = prompt("Enter lead name:");
  if (!name) return;
  const lead = {
    id: Date.now(),
    name: name,
    stage: "New",
    source: "Unknown",
    phone: "+919999999999",
    createdAt: new Date().toLocaleString(),
    remarks: []
  };
  leads.push(lead);
  renderLeads();
}

function renderLeads() {
  const list = document.getElementById('leadList');
  if (leads.length === 0) {
    list.innerHTML = '<p>No leads yet.</p>';
    return;
  }
  list.innerHTML = '';
  leads.forEach(lead => {
    const card = document.createElement('div');
    card.className = 'lead-card';
    card.innerHTML = `
      <h4>${lead.name}</h4>
      <p><span class="tag ${getTagClass(lead.stage)}">${lead.stage}</span> from ${lead.source}</p>
      <p class="timestamp">Added: ${lead.createdAt}</p>
      <div class="actions">
        <a href="tel:${lead.phone}" class="btn-call">📞 Call</a>
        <a href="https://wa.me/${lead.phone}" target="_blank" class="btn-wa">💬 WhatsApp</a>
        <button onclick="setFollowUp(${lead.id})">📅 Follow-up</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function getTagClass(stage) {
  switch(stage.toLowerCase()) {
    case 'new': return 'new';
    case 'follow-up': return 'follow-up';
    case 'closed': return 'closed';
    case 'dropped': return 'dropped';
    default: return 'new';
  }
}

function setFollowUp(id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;
  const remarks = prompt("Enter remarks before setting follow-up:");
  if (!remarks) {
    alert("❗ Remarks are mandatory before follow-up.");
    return;
  }
  const time = prompt("Set follow-up time (e.g., Tomorrow 11 AM):");
  lead.remarks.push({ text: remarks, time: time, addedAt: new Date().toLocaleString() });
  showMandatoryNotification(`Follow up with ${lead.name} at ${time}`);
  renderLeads();
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
    const card = document.createElement('div');
    card.className = 'workflow-card';
    card.innerHTML = `
      <h4>${wf.name}</h4>
      <p><strong>When:</strong> <span class="trigger">${wf.trigger}</span></p>
      <p><strong>Send:</strong> "${wf.message}"</p>
      <p><strong>After:</strong> ${wf.delay} hours</p>
      <div class="actions">
        <button onclick="editWorkflow(${wf.id})">✏️ Edit</button>
        <button onclick="deleteWorkflow(${wf.id})">🗑️ Delete</button>
      </div>
    `;
    list.appendChild(card);
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

// --- Appointments ---
let appointments = [];

function addAppointment() {
  const name = prompt("Client name:");
  if (!name) return;
  const date = prompt("Date & time (e.g., Tomorrow 11 AM):");
  const type = prompt("Type (e.g., Site Visit):");
  const appointment = {
    id: Date.now(),
    name: name,
    date: date,
    type: type,
    addedAt: new Date().toLocaleString()
  };
  appointments.push(appointment);
  renderAppointments();
}

function renderAppointments() {
  const list = document.getElementById('appointmentList');
  if (appointments.length === 0) {
    list.innerHTML = '<p>No appointments scheduled yet.</p>';
    return;
  }
  list.innerHTML = '';
  appointments.forEach(appt => {
    const item = document.createElement('div');
    item.className = 'appointment-item';
    item.innerHTML = `
      <div class="client">${appt.name}</div>
      <div class="time">${appt.date} • ${appt.type}</div>
      <div class="action">
        <button onclick="rescheduleAppointment(${appt.id})">🔄 Reschedule</button>
        <button onclick="markAsDone(${appt.id})">✅ Mark Done</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function rescheduleAppointment(id) {
  const appt = appointments.find(a => a.id === id);
  if (!appt) return;
  const newTime = prompt("New date & time:", appt.date);
  if (newTime) {
    appt.date = newTime;
    renderAppointments();
  }
}

function markAsDone(id) {
  appointments = appointments.filter(a => a.id !== id);
  renderAppointments();
  showMandatoryNotification("Appointment completed!");
}

// --- Auto-Lead Filter ---
let currentLead = null;

function startLeadFilter() {
  const chat = document.getElementById('leadFilterChat');
  chat.innerHTML = '';
  currentLead = { phone: "+919999999999", responses: {} };
  addBotMessage(chat, "Hi! 👋 Thanks for reaching out to Aavana Greens. To help you better, can I ask a few quick questions? 🌿");
  setTimeout(() => askSpaceQuestion(chat), 1000);
}

function askSpaceQuestion(chat) {
  addBotMessage(chat, "Which space are you looking to design?\n1️⃣ Balcony\n2️⃣ Terrace\n3️⃣ Indoor Plants\n4️⃣ Garden");
  waitForResponse(chat, (response) => {
    const space = ["Balcony", "Terrace", "Indoor Plants", "Garden"][response - 1];
    if (space) {
      currentLead.responses.space = space;
      addBotMessage(chat, `✅ You selected: ${space}`);
      setTimeout(() => askBudgetQuestion(chat), 1000);
    } else {
      addBotMessage(chat, "Please reply with 1, 2, 3, or 4.");
      waitForResponse(chat, () => askSpaceQuestion(chat));
    }
  });
}

function askBudgetQuestion(chat) {
  addBotMessage(chat, "What’s your budget?\n1️⃣ Under ₹50K\n2️⃣ ₹50K–1L\n3️⃣ Above ₹1L");
  waitForResponse(chat, (response) => {
    const budget = ["Under ₹50K", "₹50K–1L", "Above ₹1L"][response - 1];
    if (budget) {
      currentLead.responses.budget = budget;
      addBotMessage(chat, `✅ You selected: ${budget}`);
      setTimeout(() => askTimelineQuestion(chat), 1000);
    } else {
      addBotMessage(chat, "Please reply with 1, 2, or 3.");
      waitForResponse(chat, () => askBudgetQuestion(chat));
    }
  });
}

function askTimelineQuestion(chat) {
  addBotMessage(chat, "When are you planning this?\n1️⃣ This week\n2️⃣ Next month\n3️⃣ Just exploring");
  waitForResponse(chat, (response) => {
    const timeline = ["This week", "Next month", "Just exploring"][response - 1];
    if (timeline) {
      currentLead.responses.timeline = timeline;
      addBotMessage(chat, `✅ You selected: ${timeline}`);
      setTimeout(() => finalizeLead(chat), 1000);
    } else {
      addBotMessage(chat, "Please reply with 1, 2, or 3.");
      waitForResponse(chat, () => askTimelineQuestion(chat));
    }
  });
}

function finalizeLead(chat) {
  const { space, budget, timeline } = currentLead.responses;
  let priority = "Cold";
  if (timeline === "This week" && budget === "Above ₹1L") priority = "Hot";
  else if (timeline === "Next month") priority = "Warm";

  addBotMessage(chat, `🎯 Lead Qualified!\nSpace: ${space}\nBudget: ${budget}\nTimeline: ${timeline}\nPriority: ${priority}`);

  db.collection('leads').add({
    ...currentLead.responses,
    priority: priority,
    status: "New",
    assignedTo: priority === "Hot" ? "Raj" : "Inside Sales",
    timestamp: new Date()
  });

  if (timeline === "Just exploring") {
    setTimeout(() => {
      sendWhatsApp(currentLead.phone, "Hi! Here’s our latest catalog: https://yourdomain.com/catalog.pdf");
    }, 2000);
  }

  addBotMessage(chat, "✅ Lead saved and assigned!");
}

function addBotMessage(chat, text) {
  const p = document.createElement('p');
  p.className = 'bot';
  p.innerHTML = `<strong>🤖 Aavana Bot:</strong> ${text.replace(/\n/g, '<br>')}`;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight;
}

function waitForResponse(chat, callback) {
  const input = prompt("Simulate client reply (enter 1, 2, 3, or 4):");
  if (input && /^[1-4]$/.test(input)) {
    const p = document.createElement('p');
    p.className = 'user';
    p.innerHTML = `<strong>You:</strong> ${input}`;
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
    callback(input);
  } else {
    addBotMessage(chat, "Invalid input. Try again.");
    waitForResponse(chat, callback);
  }
}
