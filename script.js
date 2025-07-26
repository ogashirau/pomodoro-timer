const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const workDurationInput = document.getElementById('work-duration');
const breakDurationInput = document.getElementById('break-duration');
const logList = document.getElementById('log-list');
const clearLogBtn = document.getElementById('clear-log-btn');

let timer;
let isRunning = false;
let isWorkTime = true;
let workDuration = 25 * 60;
let breakDuration = 5 * 60;
let timeLeft = workDuration;

// Defer AudioContext creation until user interaction
let audioContext = null;
let isAudioUnlocked = false;

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// --- Log Functions ---
function logSession() {
    const logs = JSON.parse(localStorage.getItem('pomodoroLogs')) || [];
    const timestamp = new Date().toLocaleString();
    logs.push(timestamp);
    localStorage.setItem('pomodoroLogs', JSON.stringify(logs));
    updateLogDisplay();
}

function updateLogDisplay() {
    const logs = JSON.parse(localStorage.getItem('pomodoroLogs')) || [];
    logList.innerHTML = '';
    logs.forEach(log => {
        const li = document.createElement('li');
        li.textContent = `完了: ${log}`;
        logList.appendChild(li);
    });
}

function clearLog() {
    localStorage.removeItem('pomodoroLogs');
    updateLogDisplay();
}

// --- Audio & Notification ---

// Function to initialize and unlock audio, must be called from a user gesture
function initializeAudio() {
    if (isAudioUnlocked) return;
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    isAudioUnlocked = true;
}

function playSound() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
}

// Visual feedback for iOS and other devices without Notification support
function flashBackground() {
    let count = 0;
    const originalColor = document.body.style.backgroundColor;
    const flashColor = '#f0ad4e'; // A noticeable color
    const interval = setInterval(() => {
        document.body.style.backgroundColor = (count % 2 === 0) ? flashColor : originalColor;
        count++;
        if (count > 5) { // Flash 3 times
            clearInterval(interval);
            document.body.style.backgroundColor = originalColor;
        }
    }, 300);
}

function showNotification(message) {
    // Check for Notification API support
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ポモドーロタイマー', { body: message });
    } else {
        // Fallback for unsupported browsers (like on iOS)
        flashBackground();
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// --- Timer Logic ---

function switchMode() {
    stopTimer();
    if (isWorkTime) {
        logSession();
    }
    isWorkTime = !isWorkTime;
    timeLeft = isWorkTime ? workDuration : breakDuration;
    const message = isWorkTime ? '休憩終了！作業を始めましょう。' : '作業終了！休憩時間です。';
    showNotification(message);
    playSound();
    updateDisplay();
    startTimer(); // Automatically start the next timer
}

function startTimer() {
    if (isRunning) return;

    // **CRITICAL for iOS**: Initialize audio on the first user tap
    initializeAudio();
    
    // Also request notification permission on first tap
    requestNotificationPermission();

    isRunning = true;
    timer = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft < 0) {
            switchMode();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    isRunning = false;
}

function resetTimer() {
    stopTimer();
    isWorkTime = true;
    timeLeft = workDurationInput.value * 60;
    updateDisplay();
}

function updateDurations() {
    if (isRunning) return;
    workDuration = workDurationInput.value * 60;
    breakDuration = breakDurationInput.value * 60;
    if (isWorkTime) {
        timeLeft = workDuration;
    } else {
        timeLeft = breakDuration;
    }
    updateDisplay();
}

// --- Initial Setup ---
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);
clearLogBtn.addEventListener('click', clearLog);
workDurationInput.addEventListener('change', updateDurations);
breakDurationInput.addEventListener('change', updateDurations);

document.addEventListener('DOMContentLoaded', () => {
    updateLogDisplay();
    updateDisplay();
});
