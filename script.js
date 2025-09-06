// Firebase Config - Replace with your real config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
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
      document.getElementById('phoneAuth').style.display = 'none';
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
      notifications:
