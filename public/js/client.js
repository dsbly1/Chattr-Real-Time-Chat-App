const socket = io();

const joinScreen    = document.getElementById('join-screen');
const chatScreen    = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const roomInput     = document.getElementById('room-input');
const joinBtn       = document.getElementById('join-btn');
const leaveBtn      = document.getElementById('leave-btn');
const messagesEl    = document.getElementById('messages');
const messageInput  = document.getElementById('message-input');
const sendBtn       = document.getElementById('send-btn');
const userList      = document.getElementById('user-list');
const typingEl      = document.getElementById('typing-indicator');
const roomNameDisp  = document.getElementById('room-name-display');
const chatRoomTitle = document.getElementById('chat-room-title');
const onlineCount   = document.getElementById('online-count');

let currentUsername = '';
let currentRoom     = '';
let typingTimer     = null;
let isTyping        = false;

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage({ username, message, timestamp, type = 'theirs' }) {
  const div = document.createElement('div');
  if (type === 'system') {
    div.className = 'msg-system';
    div.textContent = message;
  } else {
    div.className = `msg ${type}`;
    div.innerHTML = `
      <div class="msg-username">${username}</div>
      <div>${message}</div>
      <div class="msg-time">${formatTime(timestamp)}</div>
    `;
  }
  messagesEl.appendChild(div);
  scrollToBottom();
}

function updateUserList(users) {
  userList.innerHTML = users.map(u => `<li>${u}${u === currentUsername ? ' (you)' : ''}</li>`).join('');
  onlineCount.textContent = `${users.length} online`;
}

joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!username || !room) return;
  currentUsername = username;
  currentRoom = room;
  socket.emit('join_room', { username, room });
  joinScreen.classList.remove('active');
  chatScreen.classList.add('active');
  roomNameDisp.textContent = `#${room}`;
  chatRoomTitle.textContent = `#${room}`;
  messageInput.focus();
});

[usernameInput, roomInput].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') joinBtn.click(); })
);

leaveBtn.addEventListener('click', () => {
  socket.disconnect();
  chatScreen.classList.remove('active');
  joinScreen.classList.add('active');
  messagesEl.innerHTML = '';
  userList.innerHTML = '';
  typingEl.textContent = '';
  socket.connect();
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg || !currentRoom) return;
  socket.emit('send_message', { room: currentRoom, message: msg });
  appendMessage({ username: currentUsername, message: msg, timestamp: new Date().toISOString(), type: 'mine' });
  messageInput.value = '';
  if (isTyping) {
    isTyping = false;
    socket.emit('typing', { room: currentRoom, isTyping: false });
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

messageInput.addEventListener('input', () => {
  if (!currentRoom) return;
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing', { room: currentRoom, isTyping: true });
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    isTyping = false;
    socket.emit('typing', { room: currentRoom, isTyping: false });
  }, 1500);
});

socket.on('user_joined', ({ message, users }) => {
  appendMessage({ message, type: 'system' });
  updateUserList(users);
});

socket.on('receive_message', ({ username, message, timestamp }) => {
  if (username !== currentUsername) {
    appendMessage({ username, message, timestamp, type: 'theirs' });
  }
});

socket.on('user_typing', ({ username, isTyping }) => {
  typingEl.textContent = isTyping ? `${username} is typing…` : '';
});

socket.on('user_left', ({ message, users }) => {
  appendMessage({ message, type: 'system' });
  updateUserList(users);
  typingEl.textContent = '';
});
