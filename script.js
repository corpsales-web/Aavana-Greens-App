// ===============================
// Firebase Configuration (Replace with your actual config)
// ===============================
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

// ===============================
// Authentication & Onboarding
// ===============================

// Check Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    db.collection('users').doc(user.uid).get().then(doc => {
      const data = doc.data();
      if (userName) userName.textContent = data.name || "User";
      if (userRole) userRole.textContent = data.role || "Team Member";
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'block';
      loadDashboardStats();
    }).catch(err => {
      console.error("Error fetching user:", err);
    });
  } else {
    if (mainApp) mainApp.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'block';
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

  const appVerifier = new firebase.auth.RecaptchaVerifier('phoneAuth', {
    'size': 'invisible'
  });

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

// ===============================
// Tab Switching
// ===============================

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => {
    el.style.display = 'none';
  });
  document.getElementById(tabId).style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
}

// ===============================
// Drag & Drop for Sales Pipeline
// ===============================

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  ev.target.appendChild(document.getElementById(data));
  const stage = ev.target.parentElement.id;
  const leadId = data.replace('lead-', '');
  db.collection('leads').doc(leadId).update({ stage: stage });
}

// ===============================
// Dashboard Stats
// ===============================

function loadDashboardStats() {
  db.collection('leads').where('stage', '==', 'New').get().then(snapshot => {
    document.getElementById('newLeads').textContent = snapshot.size;
  });

  db.collection('leads').where('stage', '==', 'Follow-up').get().then(snapshot => {
    document.getElementById('followUps').textContent = snapshot.size;
  });

  db.collection('tasks').where('status', '==', 'Pending').get().then(snapshot => {
    document.getElementById('pendingTasks').textContent = snapshot.size;
  });

  db.collection('appointments').where('date', '>=', new Date()).get().then(snapshot => {
    document.getElementById('upcomingAppointments').textContent = snapshot.size;
  });

  db.collection('appointments').where('date', '==', new Date().toLocaleDateString()).get().then(snapshot => {
    document.getElementById('todayAppointments').textContent = snapshot.size;
  });

  db.collection('workflows').get().then(snapshot => {
    document.getElementById('workflows').textContent = snapshot.size;
  });

  db.collection('workflows').where('status', '==', 'Active').get().then(snapshot => {
    document.getElementById('activeWorkflows').textContent = snapshot.size;
  });

  db.collection('leads').where('priority', '==', 'Hot').get().then(snapshot => {
    document.getElementById('hotLeads').textContent = snapshot.size;
  });
}

// ===============================
// Voice Task Assignment
// ===============================

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
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          // Simulate AI processing
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

// ===============================
// Location Capture
// ===============================

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

// ===============================
// Leads Management
// ===============================

function addLead() {
  const name = prompt("Enter lead name:");
  if (!name) return;

  const phone = prompt("Enter phone number (+91XXXXXXXXXX):");
  if (!phone || !/^\+91\d{10}$/.test(phone)) {
    alert("Please enter a valid Indian phone number");
    return;
  }

  const email = prompt("Enter email (optional):") || "";
  const address = prompt("Enter full address:") || "";
  const city = prompt("Enter city:");
  const state = prompt("Enter state:");
  const country = prompt("Enter country:", "India");

  const source = prompt("Source? (e.g., WhatsApp, Call, Website):") || "Unknown";
  const stage = prompt("Stage? (New, Follow-up, Closed):") || "New";
  const notes = prompt("Notes? (Optional):") || "";

  const lead = {
    id: Date.now(),
    name: name,
    phone: phone,
    email: email,
    address: address,
    city: city,
    state: state,
    country: country,
    source: source,
    stage: stage,
    notes: notes,
    createdAt: new Date().toLocaleString(),
    assignedTo: "Unassigned"
  };

  db.collection('leads').add(lead)
    .then(() => {
      showMandatoryNotification(`Lead "${name}" added successfully!`);
      loadDashboardStats();
    })
    .catch(err => {
      alert("Error adding lead: " + err.message);
    });
}

// ===============================
// WhatsApp CRM - Auto-Lead Filter
// ===============================

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

// ===============================
// Tasks Management
// ===============================

function addTask() {
  const title = prompt("Task title:");
  if (!title) return;
  const assignee = prompt("Assign to:");
  const dueDate = prompt("Due date:");
  const priority = prompt("Priority (Low/Medium/High):");

  const task = {
    id: Date.now(),
    title: title,
    assignee: assignee,
    dueDate: dueDate,
    priority: priority,
    status: "Pending",
    createdAt: new Date().toLocaleString()
  };

  db.collection('tasks').add(task).then(() => {
    showMandatoryNotification(`Task "${title}" assigned to ${assignee}`);
  });
}

// ===============================
// Aavana 2.0 – Digital Smart AI Assistant
// ===============================

function aiGeneratePost() {
  const output = document.getElementById('aiOutput');
  output.innerHTML = `<p>🚀 <strong>Social Post:</strong> "Transform your balcony into a green oasis with Aavana Greens! 🌿 Book a free consultation today!"</p>`;
}

function aiRunAd() {
  const output = document.getElementById('aiOutput');
  output.innerHTML = `<p>🎯 <strong>Google Ad:</strong> "Best Indoor Plants in Bangalore – 50% Off This Week!"</p>`;
}

function aiCreateReel() {
  const output = document.getElementById('aiOutput');
  output.innerHTML = `<p>🎬 <strong>Reel Script:</strong> "3 Easy Steps to a Lush Balcony Garden!"</p>`;
}

function aiAnalyzePhoto() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.src = reader.result;
      img.style.width = '100%';
      img.style.borderRadius = '8px';
      const output = document.getElementById('aiOutput');
      output.innerHTML = `<p>✅ <strong>AI Analysis:</strong> "This space is perfect for vertical gardening with ferns and pothos."</p>`;
      output.appendChild(img);
    };
    reader.readAsDataURL(file);
  };
  fileInput.click();
}

// ===============================
// ERP Integration
// ===============================

function addLeadSource() {
  const source = prompt("Enter lead source (e.g., Indiamart, Justdial):");
  if (!source) return;

  const description = prompt("Enter description:");
  const status = "Not Connected";

  const item = document.createElement('div');
  item.className = 'source-item';
  item.innerHTML = `
    <div class="source-icon">🔗</div>
    <div class="source-info">
      <h3>${source}</h3>
      <p>${description}</p>
    </div>
    <div class="source-status not-connected">${status}</div>
    <div class="source-actions">
      <button onclick="connectSource('${source}')">🔗 Connect</button>
    </div>
  `;
  document.querySelector('.source-list').appendChild(item);
}

function connectSource(source) {
  const apiKey = prompt(`Enter API key for ${source}:`);
  if (!apiKey) return;

  showMandatoryNotification(`${source} connected!`);
}

// ===============================
// Product Catalog
// ===============================

function importExcel() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx, .csv';
  fileInput.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      jsonData.forEach(row => {
        db.collection('products').add(row);
      });
      alert(`${jsonData.length} products imported successfully!`);
    };
    reader.readAsArrayBuffer(file);
  };
  fileInput.click();
}

function addProduct() {
  const name = prompt("Product name:");
  if (!name) return;
  const price = prompt("Price:");
  const category = prompt("Category:");
  const stock = prompt("Stock:");

  db.collection('products').add({
    name, price, category, stock, addedAt: new Date()
  }).then(() => {
    alert("Product added!");
  });
}

// ===============================
// Admin Panel
// ===============================

function addRole() {
  const role = prompt("Role name (e.g., Sales, Admin, Manager):");
  if (!role) return;
  const permissions = prompt("Permissions (comma-separated):");
  db.collection('roles').add({ role, permissions }).then(() => {
    alert(`Role "${role}" created!`);
  });
}
