// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ===============================
// 1. Incoming Call → Play AI Caller Tune
// ===============================
app.post('/incoming-call', (req, res) => {
  const { callSid, from, to } = req.body;

  // Log the call
  db.collection('calls').doc(callSid).set({
    from,
    to,
    status: 'ringing',
    startTime: new Date(),
    direction: 'inbound'
  });

  // Play AI caller tune
  const response = {
    action: "play_audio",
    url: "https://yourdomain.com/audio/aavana-greens-ai-tune.mp3"
  };

  res.json(response);
});

// ===============================
// 2. IVR & Call Transfer
// ===============================
app.post('/ivr', (req, res) => {
  const { digits, callSid } = req.body;

  let response;

  if (digits === '1') {
    // Transfer to Sales
    response = {
      action: "transfer",
      number: "+919999999991",
      label: "Sales Team"
    };
  } else if (digits === '2') {
    // Transfer to Design Consultation
    response = {
      action: "transfer",
      number: "+919999999992",
      label: "Design Team"
    };
  } else if (digits === '3') {
    // Send WhatsApp catalog
    response = {
      action: "send_whatsapp",
      template: "catalog",
      to: req.body.from
    };
  } else {
    response = {
      action: "play_audio",
      url: "https://yourdomain.com/audio/invalid-option.mp3"
    };
  }

  res.json(response);
});

// ===============================
// 3. Call Recording & Notes
// ===============================
app.post('/call-ended', (req, res) => {
  const { callSid, recordingUrl, duration } = req.body;

  db.collection('calls').doc(callSid).update({
    status: 'completed',
    recordingUrl,
    duration,
    endTime: new Date()
  });

  // Auto-send notification to team
  res.json({ status: 'Call logged' });
});

// ===============================
// 4. WhatsApp Auto-Lead Filter
// ===============================
app.post('/whatsapp-webhook', (req, res) => {
  const { from, message } = req.body;

  if (message.toLowerCase().includes("hi")) {
    // Start lead qualification
    db.collection('leads').add({
      phone: from,
      source: 'WhatsApp',
      stage: 'New',
      timestamp: new Date()
    });

    // Send auto-reply
    res.json({
      action: "send_message",
      to: from,
      text: "Hi! Thanks for reaching out to Aavana Greens 🌿\nWhich space are you looking to design?\n1️⃣ Balcony\n2️⃣ Terrace\n3️⃣ Indoor Plants\n4️⃣ Garden"
    });
  }
});

// ===============================
// 5. Voice Task Assignment (AI Breakdown)
// ===============================
app.post('/voice-task', async (req, res) => {
  const { audioUrl, userId } = req.body;

  // Use Whisper API or Web Speech to convert audio to text
  const transcript = "Assign task to Raj: Visit Mr. Sharma tomorrow at 3 PM. Urgent.";

  // Extract task using AI prompt
  const task = {
    assignee: "Raj",
    action: "Site Visit",
    client: "Mr. Sharma",
    time: "tomorrow 3 PM",
    priority: "Urgent",
    addedBy: userId,
    createdAt: new Date()
  };

  await db.collection('tasks').add(task);

  // Send push notification
  res.json({ task });
});

// ===============================
// 6. ERP Sync (Indiamart, Justdial)
// ===============================
app.get('/sync/indiamart', async (req, res) => {
  // Simulate API call to Indiamart
  const leads = [
    { name: "Mr. Kumar", phone: "+918888888888", source: "Indiamart", timestamp: new Date() }
  ];

  for (let lead of leads) {
    await db.collection('leads').add(lead);
  }

  res.json({ synced: leads.length });
});

// ===============================
// 7. Number Masking
// ===============================
app.post('/mask-number', (req, res) => {
  const { customerNumber } = req.body;
  const masked = `CUST${Date.now().toString().slice(-6)}`;

  db.collection('masked_numbers').add({
    masked,
    actual: customerNumber,
    timestamp: new Date()
  });

  res.json({ masked });
});

// ===============================
// 8. AI Caller Tune (Festival)
// ===============================
app.get('/caller-tune', (req, res) => {
  const today = new Date();
  const month = today.getMonth();
  const date = today.getDate();

  let tune = "https://yourdomain.com/audio/regular.mp3";

  if (month === 10 && date === 12) {
    tune = "https://yourdomain.com/audio/diwali-tune.mp3";
  } else if (month === 2 && date === 8) {
    tune = "https://yourdomain.com/audio/holi-tune.mp3";
  }

  res.json({ tune });
});

// ===============================
// 9. Start Server
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Aavana Greens Backend running on port ${PORT}`);
});

module.exports = app;
