// Survivor's Echo — Book AI
// Replace YOUR_API_KEY_HERE with your actual Gemini API key

const API_KEY = 'AIzaSyDSUKmVD3itJsK-1E_wLnX_XbOS8xdya5Y';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let uploadedFiles = [];
let chatHistory = [];
let totalContext = '';

// DOM elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const contextList = document.getElementById('context-list');
const statusEl = document.getElementById('status');
const tokenCount = document.getElementById('token-count');
const clearBtn = document.getElementById('clear-btn');

// Add welcome message
window.onload = () => {
  addMessage('ai', `Welcome back. I'm your Survivor's Echo AI assistant.\n\nUpload your book files on the left and I'll read everything before we start. Once your files are loaded, I'll know your characters, world, rules, and story inside out.\n\nWhat are we working on today?`);
};

// File upload handler
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    await processFile(file);
  }
  fileInput.value = '';
});

async function processFile(file) {
  const name = file.name;
  addMessage('system', `Reading ${name}...`);

  try {
    let text = '';

    if (file.type === 'application/pdf') {
      text = await readPDF(file);
    } else {
      text = await readTextFile(file);
    }

    if (text && text.trim().length > 0) {
      uploadedFiles.push({ name, text });
      totalContext += `\n\n=== FILE: ${name} ===\n${text}`;
      updateFileList();
      updateContextDisplay();
      addMessage('system', `✅ ${name} loaded — ${text.length.toLocaleString()} characters read`);
      statusEl.textContent = `${uploadedFiles.length} file(s) loaded into AI memory`;
    } else {
      addMessage('system', `⚠️ ${name} — could not read content. Try saving as .txt`);
    }
  } catch (err) {
    addMessage('system', `❌ Error reading ${name}: ${err.message}`);
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

async function readPDF(file) {
  // Load PDF.js from CDN
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `\n[Page ${i}]\n${pageText}`;
  }

  return fullText;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function updateFileList() {
  fileList.innerHTML = '';
  uploadedFiles.forEach((f, idx) => {
    const div = document.createElement('div');
    div.className = 'file-item loaded';
    div.innerHTML = `
      <span>📄 ${f.name}</span>
      <button onclick="removeFile(${idx})" title="Remove">✕</button>
    `;
    fileList.appendChild(div);
  });
}

function removeFile(idx) {
  // ✅ Fix: grab first element of splice result
  const removed = uploadedFiles.splice(idx, 1);
  totalContext = uploadedFiles.map(f =>
    `\n\n=== FILE: ${f.name} ===\n${f.text}`).join('');
  updateFileList();
  updateContextDisplay();
  addMessage('system', `🗑 ${removed.name} removed from AI memory`);
  if (uploadedFiles.length === 0) {
    statusEl.textContent = 'Upload your files on the left to get started';
  }
}

function updateContextDisplay() {
  contextList.innerHTML = '';
  uploadedFiles.forEach(f => {
    const tag = document.createElement('div');
    tag.className = 'context-tag';
    tag.textContent = `✓ ${f.name}`;
    contextList.appendChild(tag);
  });
  const approxTokens = Math.round(totalContext.length / 4);
  tokenCount.textContent = `Context: ~${approxTokens.toLocaleString()} tokens`;
}

// Send message
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    addMessage('system', '⚠️ Please add your Gemini API key to app.js first');
    return;
  }

  userInput.value = '';
  sendBtn.disabled = true;
  addMessage('user', text);

  const systemPrompt = totalContext.length > 0
    ? `You are a creative writing AI assistant for the author of "Survivor's Echo" — a zombie apocalypse book series. You have been given the author's complete book files as context. Read them carefully and use them as your source of truth for everything about this project.\n\nHere are all the author's files:\n${totalContext}\n\nAlways stay consistent with what is in these files. If something isn't in the files, say so honestly rather than making things up. Be creative, helpful, and supportive of the author's vision.`
    : `You are a creative writing AI assistant helping the author of "Survivor's Echo" — a zombie apocalypse book series. No files have been uploaded yet. Encourage the author to upload their book files so you can learn everything about their project.`;

  chatHistory.push({ role: 'user', parts: [{ text }] });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: chatHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API error');
    }

    const data = await response.json();
    // ✅ Fix: correct optional chaining with array index access
    const reply = data.candidates?.?.content?.parts?.?.text || 'No response received';

    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    addMessage('ai', reply);

  } catch (err) {
    addMessage('system', `❌ Error: ${err.message}`);
    chatHistory.pop();
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

function addMessage(type, text) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Clear chat
clearBtn.addEventListener('click', () => {
  chatHistory = [];
  chatBox.innerHTML = '';
  addMessage('system', 'Chat cleared. Files still loaded in memory.');
});
