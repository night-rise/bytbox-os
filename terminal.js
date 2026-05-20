// terminal.js - Core terminal with registration, trolling, and editor

const SOUNDS = {
  keystroke: [
    new Howl({ src: ['assets/sounds/keystroke1.wav'], volume: 0.3 }),
    new Howl({ src: ['assets/sounds/keystroke2.wav'], volume: 0.3 }),
    new Howl({ src: ['assets/sounds/keystroke3.wav'], volume: 0.3 })
  ],
  return: new Howl({ src: ['assets/sounds/return.wav'], volume: 0.4 }),
  space: new Howl({ src: ['assets/sounds/space.wav'], volume: 0.3 }),
  backspace: new Howl({ src: ['assets/sounds/backspace.wav'], volume: 0.3 }),
  startup: new Howl({ src: ['assets/sounds/startup.wav'], volume: 0.5 }),
  hdd: new Howl({ src: ['assets/sounds/hdd.wav'], volume: 0.4, loop: true }),
  hddSpinup: new Howl({ src: ['assets/sounds/hdd_spinup.wav'], volume: 0.5 }),
  modem: new Howl({ src: ['assets/sounds/modem.wav'], volume: 0.6 }),
  error: new Howl({ src: ['assets/sounds/error.wav'], volume: 0.5 }),
  success: new Howl({ src: ['assets/sounds/success.wav'], volume: 0.5 }),
  click: new Howl({ src: ['assets/sounds/click.wav'], volume: 0.4 }),
  fanNoise: new Howl({ src: ['assets/sounds/fan_noise.wav'], volume: 0.2, loop: true }),
  overheat: new Howl({ src: ['assets/sounds/overheat.wav'], volume: 0.7 }),
  ambient: new Howl({ src: ['assets/sounds/ambient_noise.wav'], volume: 0.08, loop: true }),
  linux: new Howl({ src: ['assets/sounds/linux.wav'], volume: 0.5, loop: true }),
  macos: new Howl({ src: ['assets/sounds/macos.wav'], volume: 0.6 }),
  fart: new Howl({ src: ['assets/sounds/fart.wav'], volume: 0.7, loop: true }),
  npm: new Howl({ src: ['assets/sounds/npm.wav'], volume: 0.6 }),
  explosion: new Howl({ src: ['assets/sounds/npm.wav'], volume: 0.8, loop: true }),
  notification: new Howl({ src: ['assets/sounds/notification.wav'], volume: 0.7 })
};

SOUNDS.ambient.play();

function playRandomKeystroke() {
  const s = SOUNDS.keystroke[Math.floor(Math.random() * SOUNDS.keystroke.length)];
  s.play();
}

const terminal = document.getElementById('terminal');
let commandHistory = [];
let historyIndex = -1;

// ----- Editor state -----
let editorMode = false;
let editorNode = null;
let editorFileName = '';
let editorTextLines = [];
let editorCursorX = 0;
let editorCursorY = 0;
let editorKeyHandler = null;

// ----- Counter for consecutive get/npm install (triggers BSOD) -----
let consecutiveGetNpmCount = 0;

// ----- Troll state -----
let trollMode = localStorage.getItem('bytbox_troll') !== 'false';
let trollPopupTimer = null;
let trollFbiInterval = null;
let fbiTimerInterval = null;
let fbiSeconds = 599;
let commandCount = 0;
let popupCommandThreshold = Math.floor(Math.random() * 3) + 3;
let absurdCommandThreshold = Math.floor(Math.random() * 6) + 5;

const wordReplacements = {
  'file': 'potato',
  'directory': 'fridge',
  'user': 'minion',
  'root': 'overlord',
  'error': 'whoopsie',
  'command': 'spell'
};

const absurdCommands = [
  "minion",
  "sudo i am a loser",
  "kill",
  "bytbox is the best os",
  "moo",
  "sudo make me a sandwich",
  "fart",
  "specs",
  "rickroll"
];

// ========== REGISTRATION ==========
function checkRegistration() {
  return !!localStorage.getItem('bytbox_username');
}

function showRegistrationForm() {
  const overlay = document.createElement('div');
  overlay.id = 'registration-overlay';
  overlay.innerHTML = `
    <h2>Welcome to BytBox OS</h2>
    <p>Please register to continue</p>
    <input type="text" id="reg-username" placeholder="Username" />
    <input type="password" id="reg-password" placeholder="Password" />
    <input type="email" id="reg-email" placeholder="Email" />
    <button id="reg-submit">Register</button>
  `;
  document.body.appendChild(overlay);
  document.getElementById('reg-submit').addEventListener('click', () => {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    if (!username || !password || !email) return;
    localStorage.setItem('bytbox_username', username);
    localStorage.setItem('bytbox_email', email);
    localStorage.setItem('bytbox_password', password);
    overlay.remove();
    startBytBox(username);
  });
}

function showUpdateScreen(callback) {
  const updateDiv = document.createElement('div');
  updateDiv.id = 'update-screen';
  updateDiv.innerHTML = `
    <h2>Installing updates...</h2>
    <div class="progress-bar" style="width:300px;">
      <div class="progress-fill" id="update-fill" style="width:0%;"></div>
    </div>
    <p id="update-status">1 of 42</p>
  `;
  document.body.appendChild(updateDiv);
  let progress = 0;
  const fill = document.getElementById('update-fill');
  const status = document.getElementById('update-status');
  const interval = setInterval(() => {
    progress += 2;
    if (fill) fill.style.width = Math.min(progress, 100) + '%';
    if (status && progress < 100) status.textContent = Math.ceil(progress / 2.38) + ' of 42';
    if (progress >= 100) {
      clearInterval(interval);
      if (status) status.textContent = 'All updates failed. Retrying...';
      const handler = (e) => {
        updateDiv.remove();
        document.removeEventListener('keydown', handler);
        callback();
      };
      document.addEventListener('keydown', handler);
    }
  }, 100);
}

// ========== TROLL FEATURES ==========
function startTrolling() {
  if (!trollMode) return;
  scheduleNextPopup();
  trollFbiInterval = setInterval(showRandomFbiInspection, 30000);
  showFbiTimer();
  fbiTimerInterval = setInterval(updateFbiTimer, 1000);
  scheduleRandomFlip();
}

function stopTrolling() {
  if (trollPopupTimer) clearTimeout(trollPopupTimer);
  if (trollFbiInterval) clearInterval(trollFbiInterval);
  if (fbiTimerInterval) clearInterval(fbiTimerInterval);
  document.getElementById('fbi-timer').classList.add('hidden');
  fbiSeconds = 599;
}

function scheduleNextPopup() {
  if (!trollMode) return;
  const delay = 30000 + Math.random() * 60000;
  trollPopupTimer = setTimeout(() => {
    if (trollMode) showRandomPopup();
    scheduleNextPopup();
  }, delay);
}

function showRandomPopup() {
  const messages = [
    { text: "Your free trial of BytBox is expiring in 3 days. Upgrade now!", type: 'info' },
    { text: "Low disk space on drive C: — 0 bytes free. Delete something!", type: 'info' },
    { text: "BEST FART RESISTOR", type: 'info' },
    {
      text: "WE FOUND 123819023 VIRUSES ON YOUR TOASTER, REMOVE?",
      type: 'confirm',
      confirmCallback: () => window.open('https://youtu.be/dQw4w9WgXcQ?si=Gm1Lj5qAV0yZYZIv', '_blank')
    },
    { text: "Notification from Microsoft: Your Windows license is invalid.", type: 'info' },
    { text: "A wild BSOD appeared! (just kidding)", type: 'info' },
    { text: "Did you know? BytBox is powered by hamsters. Feed them with 'npm install'.", type: 'info' }
  ];
  const popupData = messages[Math.floor(Math.random() * messages.length)];
  const popup = document.createElement('div');
  popup.className = 'fullscreen-popup';
  popup.innerHTML = `
    <div class="popup-message">${popupData.text}</div>
    <div class="popup-hint">${popupData.type === 'confirm' ? 'Press Y to remove, N to ignore' : 'Press any key to close'}</div>
  `;
  document.body.appendChild(popup);
  SOUNDS.notification.play();

  setTimeout(() => {
    const keyHandler = (e) => {
      if (popupData.type === 'confirm') {
        if (e.key === 'y' || e.key === 'Y') {
          if (popupData.confirmCallback) popupData.confirmCallback();
          popup.remove();
          document.removeEventListener('keydown', keyHandler);
          document.getElementById('command-input')?.focus();
        } else if (e.key === 'n' || e.key === 'N') {
          popup.remove();
          document.removeEventListener('keydown', keyHandler);
          document.getElementById('command-input')?.focus();
        }
      } else {
        if (e.key) {
          popup.remove();
          document.removeEventListener('keydown', keyHandler);
          document.getElementById('command-input')?.focus();
        }
      }
    };
    document.addEventListener('keydown', keyHandler);
  }, 200);
}

function showRandomFbiInspection() {
  if (!trollMode) return;
  const inspections = [
    showFbiPasswordCheck,
    showFbiFileScan,
    showFbiWebcamCheck,
    showFbiChatAgent
  ];
  const selected = inspections[Math.floor(Math.random() * inspections.length)];
  selected();
}

function showFbiPasswordCheck() {
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-popup';
  overlay.innerHTML = `
    <div class="popup-message">FBI REMOTE INSPECTION IN PROGRESS...</div>
    <div>Please enter your password to continue</div>
    <input type="password" id="fbi-password" style="margin-top:15px; padding:8px; background:black; border:1px solid var(--text-color); color:var(--text-color); font-family:inherit;" autofocus>
  `;
  document.body.appendChild(overlay);
  SOUNDS.modem.play();
  const input = document.getElementById('fbi-password');
  input.focus();
  const submitHandler = (e) => {
    if (e.key === 'Enter') {
      input.style.display = 'none';
      overlay.querySelector('.popup-message').textContent = 'Suspicious activity detected... Scanning files...';
      let progress = 0;
      const progressDiv = document.createElement('div');
      progressDiv.className = 'progress-bar';
      progressDiv.style.width = '200px';
      progressDiv.innerHTML = '<div class="progress-fill" style="width:0%"></div>';
      overlay.appendChild(progressDiv);
      const fill = progressDiv.querySelector('.progress-fill');
      const scanInterval = setInterval(() => {
        progress += 10;
        if (fill) fill.style.width = progress + '%';
        if (progress >= 100) {
          clearInterval(scanInterval);
          setTimeout(() => {
            overlay.remove();
            document.getElementById('command-input')?.focus();
          }, 500);
        }
      }, 200);
      document.removeEventListener('keydown', submitHandler);
    }
  };
  document.addEventListener('keydown', submitHandler);
}

function showFbiFileScan() {
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-popup';
  let fileContent = '';
  try {
    const sumoersNode = getNodeAtPath(ROOT_NODE, ['~', 'etc', 'sumoers']);
    fileContent = sumoersNode ? sumoersNode.content : 'minion ALL=(ALL) ALL';
  } catch(e) { fileContent = 'classified'; }
  overlay.innerHTML = `
    <div class="popup-message">Scanning your files...<br>Found suspicious entry in /etc/sumoers:</div>
    <div style="margin-top:20px; background:black; padding:10px; border:1px solid var(--text-color);">${escapeHtml(fileContent)}</div>
    <div class="popup-hint">Press any key to continue</div>
  `;
  document.body.appendChild(overlay);
  SOUNDS.hdd.play();
  const keyHandler = (e) => {
    overlay.remove();
    document.removeEventListener('keydown', keyHandler);
    SOUNDS.hdd.stop();
    document.getElementById('command-input')?.focus();
  };
  document.addEventListener('keydown', keyHandler);
}

function showFbiWebcamCheck() {
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-popup';
  overlay.innerHTML = `
    <div class="popup-message">FBI requires access to your webcam for identity verification.</div>
    <div id="webcam-container" style="width:320px; height:240px; margin-top:20px; background:black; border:1px solid var(--text-color); display:flex; align-items:center; justify-content:center;"></div>
    <div class="popup-hint">Allow camera access or press any key to deny</div>
  `;
  document.body.appendChild(overlay);
  SOUNDS.modem.play();

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        const container = document.getElementById('webcam-container');
        if (container) {
          container.innerHTML = '';
          container.appendChild(video);
        }
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.bottom = '10px';
        label.style.color = 'red';
        label.textContent = 'FBI is watching you';
        overlay.appendChild(label);
        setTimeout(() => {
          stream.getTracks().forEach(track => track.stop());
          overlay.remove();
          document.getElementById('command-input')?.focus();
        }, 5000);
      })
      .catch(() => {
        const container = document.getElementById('webcam-container');
        if (container) {
          container.innerHTML = '<div style="color:red;">Camera access granted.<br>We see you.</div>';
        }
        setTimeout(() => {
          overlay.remove();
          document.getElementById('command-input')?.focus();
        }, 3000);
      });
  } else {
    const container = document.getElementById('webcam-container');
    if (container) container.innerHTML = '<div>No camera detected.</div>';
    setTimeout(() => {
      overlay.remove();
      document.getElementById('command-input')?.focus();
    }, 3000);
  }

  const keyHandler = (e) => {
    overlay.remove();
    document.removeEventListener('keydown', keyHandler);
    document.getElementById('command-input')?.focus();
  };
  document.addEventListener('keydown', keyHandler);
}

function showFbiChatAgent() {
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-popup';
  overlay.innerHTML = `
    <div class="popup-message">Incoming chat from Agent Smith...</div>
    <div id="chat-text" style="margin-top:20px; background:black; padding:10px; border:1px solid var(--text-color); max-width:400px; text-align:left;"></div>
    <div class="popup-hint">Press any key to ignore</div>
  `;
  document.body.appendChild(overlay);
  SOUNDS.modem.play();

  const chatText = document.getElementById('chat-text');
  const message = "Hello, this is Agent Smith. We need to ask you a few questions about your recent activity.";
  let i = 0;
  const typing = setInterval(() => {
    if (i < message.length) {
      chatText.textContent += message[i];
      i++;
    } else {
      clearInterval(typing);
    }
  }, 50);

  const keyHandler = (e) => {
    clearInterval(typing);
    overlay.remove();
    document.removeEventListener('keydown', keyHandler);
    document.getElementById('command-input')?.focus();
  };
  document.addEventListener('keydown', keyHandler);
}

function showFbiTimer() {
  const timerDiv = document.getElementById('fbi-timer');
  timerDiv.classList.remove('hidden');
  timerDiv.addEventListener('click', () => {
    writeOutput("I'm watching you.");
    SOUNDS.error.play();
  });
}

function updateFbiTimer() {
  if (!trollMode) return;
  const countdownEl = document.getElementById('fbi-countdown');
  if (!countdownEl) return;
  fbiSeconds--;
  if (fbiSeconds <= 0) {
    clearInterval(fbiTimerInterval);
    if (typeof window.commands.kill === 'function') {
      window.commands.kill();
    }
    return;
  }
  const mins = Math.floor(fbiSeconds / 60);
  const secs = fbiSeconds % 60;
  countdownEl.textContent = `${mins}:${secs < 10 ? '0' + secs : secs}`;
}

function scheduleRandomFlip() {
  const delay = 180000 + Math.random() * 120000;
  setTimeout(() => {
    if (!trollMode) return;
    document.body.classList.add('flipped');
    setTimeout(() => document.body.classList.remove('flipped'), 2000);
    scheduleRandomFlip();
  }, delay);
}

// ========== WORD REPLACEMENT ==========
function trollifyText(text) {
  if (!trollMode) return text;
  let newText = text;
  for (const [word, replacement] of Object.entries(wordReplacements)) {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    newText = newText.replace(regex, replacement);
  }
  return newText;
}

// ========== COMMAND EXECUTION HOOKS ==========
function shouldShowPopup() {
  if (!trollMode) return false;
  commandCount++;
  if (commandCount % popupCommandThreshold === 0) {
    popupCommandThreshold = Math.floor(Math.random() * 3) + 3;
    return true;
  }
  return false;
}

function shouldReplaceCommand() {
  if (!trollMode) return false;
  commandCount++;
  if (commandCount % absurdCommandThreshold === 0) {
    absurdCommandThreshold = Math.floor(Math.random() * 6) + 5;
    return true;
  }
  return false;
}

function getRandomAbsurdCommand() {
  return absurdCommands[Math.floor(Math.random() * absurdCommands.length)];
}

// ========== EDITOR MODE (tiny) ==========
function startEditorMode(node, fileName) {
  editorMode = true;
  editorNode = node;
  editorFileName = fileName;
  editorTextLines = (node.content || '').split('\n');
  editorCursorX = 0;
  editorCursorY = 0;

  const input = document.getElementById('command-input');
  input.style.display = 'none';
  document.querySelector('.input-line .prompt').style.display = 'none';

  const editorDiv = document.createElement('div');
  editorDiv.id = 'editor-overlay';
  editorDiv.tabIndex = -1;
  editorDiv.style.cssText = `white-space: pre; padding: 10px; background: var(--bg-color); color: var(--text-color); font-family: inherit; height: calc(100% - 70px); overflow-y: auto; outline: none;`;
  terminal.appendChild(editorDiv);

  const helpBar = document.createElement('div');
  helpBar.id = 'nano-helpbar';
  helpBar.style.cssText = `position: absolute; bottom: 0; left: 20px; right: 20px; height: 30px; background: var(--bg-color); border-top: 1px solid var(--text-color); color: var(--text-color); font-size: 10px; display: flex; align-items: center; justify-content: center; gap: 20px; font-family: inherit;`;
  helpBar.innerHTML = `<span>^S Save</span> <span>^X Exit</span> <span>Arrows: Move</span>`;
  terminal.appendChild(helpBar);

  renderEditor(editorDiv);
  editorDiv.focus();

  editorKeyHandler = (e) => handleGlobalEditorKeys(e);
  document.addEventListener('keydown', editorKeyHandler);
}

function handleGlobalEditorKeys(e) {
  if (!editorMode) return;
  e.preventDefault();

  if (e.ctrlKey && e.key === 's') {
    editorNode.content = editorTextLines.join('\n');
    SOUNDS.success.play();
    writeOutput(`[ Saved ${editorFileName} ]`);
    return;
  }
  if (e.ctrlKey && e.key === 'x') {
    exitEditor();
    return;
  }
  if (e.key === 'ArrowUp') { if (editorCursorY > 0) editorCursorY--; }
  else if (e.key === 'ArrowDown') { if (editorCursorY < editorTextLines.length - 1) editorCursorY++; }
  else if (e.key === 'ArrowLeft') { if (editorCursorX > 0) editorCursorX--; }
  else if (e.key === 'ArrowRight') { if (editorCursorX < (editorTextLines[editorCursorY] || '').length) editorCursorX++; }
  else if (e.key === 'Backspace') {
    const line = editorTextLines[editorCursorY];
    if (editorCursorX > 0) {
      editorTextLines[editorCursorY] = line.slice(0, editorCursorX-1) + line.slice(editorCursorX);
      editorCursorX--;
    } else if (editorCursorY > 0) {
      const prevLine = editorTextLines[editorCursorY-1];
      editorCursorX = prevLine.length;
      editorTextLines[editorCursorY-1] = prevLine + line;
      editorTextLines.splice(editorCursorY, 1);
      editorCursorY--;
    }
  }
  else if (e.key === 'Enter') {
    const line = editorTextLines[editorCursorY];
    const before = line.slice(0, editorCursorX);
    const after = line.slice(editorCursorX);
    editorTextLines[editorCursorY] = before;
    editorTextLines.splice(editorCursorY+1, 0, after);
    editorCursorY++;
    editorCursorX = 0;
  }
  else if (e.key.length === 1) {
    const line = editorTextLines[editorCursorY] || '';
    editorTextLines[editorCursorY] = line.slice(0, editorCursorX) + e.key + line.slice(editorCursorX);
    editorCursorX++;
  }
  renderEditor(document.getElementById('editor-overlay'));
}

function renderEditor(container) {
  if (!container) return;
  let html = '';
  for (let i = 0; i < editorTextLines.length; i++) {
    if (i === editorCursorY) {
      const before = escapeHtml(editorTextLines[i].slice(0, editorCursorX));
      const cursor = editorCursorX < editorTextLines[i].length ? escapeHtml(editorTextLines[i][editorCursorX]) : ' ';
      const after = escapeHtml(editorTextLines[i].slice(editorCursorX+1));
      html += `<div>${before}<span class="blink" style="background:var(--text-color);color:var(--bg-color)">${cursor}</span>${after}</div>`;
    } else {
      html += `<div>${escapeHtml(editorTextLines[i])}</div>`;
    }
  }
  container.innerHTML = html;
}

function exitEditor() {
  editorNode.content = editorTextLines.join('\n');
  editorMode = false;
  editorNode = null;
  editorFileName = '';
  document.removeEventListener('keydown', editorKeyHandler);
  editorKeyHandler = null;

  const input = document.getElementById('command-input');
  input.style.display = '';
  document.querySelector('.input-line .prompt').style.display = '';

  const overlay = document.getElementById('editor-overlay');
  if (overlay) overlay.remove();
  const helpBar = document.getElementById('nano-helpbar');
  if (helpBar) helpBar.remove();

  input.focus();
  updatePromptDisplay();
}

// ========== INITIALIZATION ==========
function startBytBox(username) {
  const updatesDone = localStorage.getItem('bytbox_updates_done');
  if (!updatesDone) {
    showUpdateScreen(() => {
      localStorage.setItem('bytbox_updates_done', 'true');
      initTerminal();
      writeOutput(`Welcome, ${username}!`);
      if (trollMode) startTrolling();
      document.getElementById('command-input').focus();
    });
  } else {
    initTerminal();
    writeOutput(`Welcome back, ${username}!`);
    if (trollMode) startTrolling();
    document.getElementById('command-input').focus();
  }
}

function initTerminal() {
  if (document.getElementById('output')) return;
  const outputDiv = document.createElement('div');
  outputDiv.className = 'output';
  outputDiv.id = 'output';
  terminal.appendChild(outputDiv);

  const inputLine = document.createElement('div');
  inputLine.className = 'input-line';
  const prompt = document.createElement('span');
  prompt.className = 'prompt';
  prompt.innerHTML = getPrompt();
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'command-input';
  input.autofocus = true;
  input.autocomplete = 'off';
  input.spellcheck = false;
  inputLine.appendChild(prompt);
  inputLine.appendChild(input);
  terminal.appendChild(inputLine);

  input.addEventListener('keydown', handleKeyDown);
  input.addEventListener('keydown', handleKeySounds);
  terminal.addEventListener('click', () => {
    if (!editorMode) input.focus();
  });

  writeOutput('BytBox OS v1.0.1 (tty1)');
  writeOutput('Type "info" for available commands.');
  writeOutput('');
  if (typeof applyTheme === 'function') applyTheme();
}

function handleKeySounds(e) {
  if (editorMode) return;
  if (e.key === 'Enter') SOUNDS.return.play();
  else if (e.key === 'Backspace') SOUNDS.backspace.play();
  else if (e.key === ' ') SOUNDS.space.play();
  else if (e.key.length === 1) playRandomKeystroke();
}

function handleKeyDown(e) {
  if (editorMode) return;
  const input = e.target;
  if (e.key === 'Tab') {
    e.preventDefault();
    const inputText = input.value.trim().split(' ')[0];
    if (!inputText) return;
    const avail = Object.keys(window.commands);
    const matches = avail.filter(cmd => cmd.startsWith(inputText));
    if (matches.length === 1) {
      const rest = input.value.trim().slice(inputText.length);
      input.value = matches[0] + rest;
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
    } else if (matches.length > 1) {
      writeOutput('Possible commands: ' + matches.join(', '));
      scrollToBottom();
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    let text = input.value.trim();
    input.value = '';
    if (!text) return;
    const originalText = text;
    if (trollMode && shouldReplaceCommand() && !['troll','sumo','sudo','kill','exit'].includes(text.split(' ')[0].toLowerCase())) {
      text = getRandomAbsurdCommand();
    }
    commandHistory.push(originalText);
    historyIndex = commandHistory.length;
    writeOutput(getPrompt() + originalText);
    const result = processCommand(text);
    if (result && typeof result === 'string' && result !== '') writeOutput(trollifyText(result));
    if (result instanceof Promise) {
      result.then(res => { if (res) writeOutput(trollifyText(res)); });
    }
    updatePromptDisplay();
    scrollToBottom();

    if (trollMode && shouldShowPopup()) {
      showRandomPopup();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      input.value = commandHistory[historyIndex];
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      input.value = commandHistory[historyIndex];
    } else {
      historyIndex = commandHistory.length;
      input.value = '';
    }
  }
}

// ----- Command processing -----
function processCommand(input) {
  const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));

  // BSOD easter egg: if get or npm install is called 3 times consecutively
  if (cmdName === 'get' || cmdName === 'npm') {
    consecutiveGetNpmCount++;
    if (consecutiveGetNpmCount >= 3) {
      consecutiveGetNpmCount = 0;
      if (typeof window.commands.bsod === 'function') {
        window.commands.bsod();
      }
      return 'Kernel panic: too many installations.';
    }
  } else {
    consecutiveGetNpmCount = 0;
  }

  if (typeof window.commands !== 'undefined' && cmdName in window.commands) {
    try {
      const result = window.commands[cmdName](args);
      if (result instanceof Promise) {
        result.then(res => {
          if (typeof res === 'string' && res !== '') writeOutput(trollifyText(res));
        }).catch(err => {
          writeOutput(`Error: ${err}`);
          SOUNDS.error.play();
        });
        return '';
      } else {
        return result || '';
      }
    } catch (e) {
      SOUNDS.error.play();
      return `Error: ${e.message}`;
    }
  } else {
    SOUNDS.error.play();
    return `command not found: ${cmdName}`;
  }
}

function writeOutput(text) {
  const output = document.getElementById('output');
  if (!output) return;
  const line = document.createElement('div');
  line.textContent = trollifyText(text);
  output.appendChild(line);
}

function writeHTML(html) {
  const output = document.getElementById('output');
  if (!output) return;
  const div = document.createElement('div');
  div.innerHTML = html;
  output.appendChild(div);
}

function scrollToBottom() {
  terminal.scrollTop = terminal.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkRegistration()) {
    showRegistrationForm();
  } else {
    const username = localStorage.getItem('bytbox_username');
    startBytBox(username);
  }
});