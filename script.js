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
      loadAIInsights();
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

// Tab Switching
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

// Drag & Drop for Pipeline
function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  const target = ev.target.classList.contains('lead-items') ? ev.target : ev.target.closest('.lead-items');
  if (target) {
    target.appendChild(document.getElementById(data));
  }
  const stage = target.parentElement.id;
  const leadId = data.replace('lead-', '');
  db.collection('leads').doc(leadId).update({ stage: stage });
}

// Load Dashboard Stats
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
