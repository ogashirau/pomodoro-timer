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
let workDuration = 25 * 60; // 25 minutes in seconds
let breakDuration = 5 * 60; // 5 minutes in seconds
let timeLeft = workDuration;

// Web Audio API for sound
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

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

function playSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 pitch
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
}

function showNotification(message) {
    if (Notification.permission === 'granted') {
        new Notification('ポモドーロタイマー', { body: message });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('ポモドーロタイマー', { body: message });
            }
        });
    }
}

function switchMode() {
    stopTimer();
    
    if (isWorkTime) {
        logSession(); // Log the completed work session
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

    // Resume AudioContext on user gesture
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    // Request notification permission on first start
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

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
    if (isRunning) return; // Don't change durations while timer is running
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
