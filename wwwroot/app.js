const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const newSessionButton = document.getElementById('newSessionButton');
const sessionsList = document.getElementById('sessionsList');
const sessionTitle = document.getElementById('sessionTitle');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

const USER_ID = 'alice';
let currentSessionId = generateSessionId();
let sessions = loadSessions();

// Initialize
renderSessions();

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// Send message on Enter (Shift+Enter for new line)
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);

newSessionButton.addEventListener('click', () => {
    createNewSession();
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createNewSession() {
    currentSessionId = generateSessionId();
    
    // Clear chat
    chatMessages.innerHTML = '<div class="welcome-message"><p>👋 Welcome Alice! How can I assist you today?</p></div>';
    
    // Update title
    sessionTitle.textContent = 'New Chat';
    
    // Update active session in sidebar
    renderSessions();
    
    // Focus input
    messageInput.focus();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

function loadSessions() {
    const stored = localStorage.getItem('sessions');
    return stored ? JSON.parse(stored) : {};
}

function saveSessions() {
    localStorage.setItem('sessions', JSON.stringify(sessions));
}

function updateSession(firstMessage) {
    if (!sessions[currentSessionId]) {
        sessions[currentSessionId] = {
            id: currentSessionId,
            title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : ''),
            lastMessage: new Date().toISOString(),
            messages: []
        };
    } else {
        sessions[currentSessionId].lastMessage = new Date().toISOString();
    }
    
    saveSessions();
    renderSessions();
}

function renderSessions() {
    sessionsList.innerHTML = '';
    
    const sortedSessions = Object.values(sessions).sort((a, b) => 
        new Date(b.lastMessage) - new Date(a.lastMessage)
    );
    
    sortedSessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session-item' + (session.id === currentSessionId ? ' active' : '');
        
        sessionItem.innerHTML = `
            <div class="session-item-icon">💬</div>
            <div class="session-item-content">
                <div class="session-item-title">${session.title}</div>
                <div class="session-item-time">${formatTime(session.lastMessage)}</div>
            </div>
        `;
        
        sessionItem.addEventListener('click', () => {
            loadSession(session.id);
        });
        
        sessionsList.appendChild(sessionItem);
    });
}

function loadSession(sessionId) {
    currentSessionId = sessionId;
    const session = sessions[sessionId];
    
    // Update title
    sessionTitle.textContent = session.title;
    
    // Clear and load messages
    chatMessages.innerHTML = '';
    
    if (!session.messages || session.messages.length === 0) {
        chatMessages.innerHTML = '<div class="welcome-message"><p>👋 Welcome Alice! How can I assist you today?</p></div>';
    } else {
        session.messages.forEach(msg => {
            addMessage(msg.text, msg.sender, msg.timestamp, false);
        });
    }
    
    renderSessions();
    messageInput.focus();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return date.toLocaleDateString();
}

async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Remove welcome message if it exists
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    // Update session title if it's a new session
    if (sessionTitle.textContent === 'New Chat') {
        sessionTitle.textContent = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }
    
    // Add user message to chat
    addMessage(message, 'user', new Date().toISOString());
    
    // Update session
    updateSession(message);
    
    // Disable send button
    sendButton.disabled = true;
    
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                userId: USER_ID,
                sessionId: currentSessionId
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get response');
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add assistant message
        addMessage(data.message, 'assistant', data.timestamp);
        
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator(typingId);
        showError(error.message || 'Failed to send message. Please try again.');
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
}

function addMessage(text, sender, timestamp, saveToSession = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textP = document.createElement('p');
    textP.style.whiteSpace = 'pre-wrap';
    textP.textContent = text;
    contentDiv.appendChild(textP);
    
    if (timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date(timestamp).toLocaleTimeString();
        contentDiv.appendChild(timeDiv);
    }
    
    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.6567 3.08839C16.2714 2.71211 15.7559 2.5 15.2161 2.5H10C8.89543 2.5 8 3.39543 8 4.5Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 18V20.5C16 21.6046 15.1046 22.5 14 22.5H6C4.89543 22.5 4 21.6046 4 20.5V9.5C4 8.39543 4.89543 7.5 6 7.5H8" stroke="currentColor" stroke-width="1.5"/>
        </svg>
    `;
    copyButton.title = 'Copy message';
    copyButton.onclick = () => copyToClipboard(text, copyButton);
    contentDiv.appendChild(copyButton);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Save to session
    if (saveToSession && sessions[currentSessionId]) {
        if (!sessions[currentSessionId].messages) {
            sessions[currentSessionId].messages = [];
        }
        sessions[currentSessionId].messages.push({
            text,
            sender,
            timestamp
        });
        saveSessions();
    }
}

async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show feedback
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        button.style.color = '#10a37f';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.color = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        showError('Failed to copy message');
    }
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    
    contentDiv.appendChild(typingIndicator);
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return 'typing-indicator';
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Focus on input on load
messageInput.focus();
