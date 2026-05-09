/**
 * AGSTONE PRO - ELITE CORE ENGINE
 * Version : 1.0.0 (Final Production)
 * Architecture : Senior System Monolith (Zéro conflit, Performance maximale)
 */

const AgStone = {
    // ==========================================
    // 1. ÉTAT & SOURCE DE VÉRITÉ (STORAGE)
    // ==========================================
    tasks: JSON.parse(localStorage.getItem('ag_tasks')) || [],
    notes: JSON.parse(localStorage.getItem('ag_notes')) || [],
    alarms: JSON.parse(localStorage.getItem('ag_alarms')) || [],
    settings: JSON.parse(localStorage.getItem('ag_settings')) || { 
        theme: 'light', font: 'inter', bgUrl: '', blur: 10 
    },
    
    activeNoteId: null,
    currentFilter: 'all',
    calDate: new Date(),
    audioContext: null, // Pour débloquer l'audio sur les navigateurs mobiles

    // Suggestions de thèmes Premium
    presets: [
        { name: "SaaS Indigo", url: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80" },
        { name: "Architecture", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80" },
        { name: "Nature Dark", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80" },
        { name: "Abstract White", url: "https://images.unsplash.com/photo-1518655061710-5ccf392c275a?auto=format&fit=crop&w=1200&q=80" },
        { name: "City Night", url: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80" },
        { name: "Forêt Enneigée", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80" },
        { name: "Espace Galactique", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80" },
        { name: "Minimalisme Gris", url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80" },
        { name: "Coucher de Soleil", url: "https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18?auto=format&fit=crop&w=1200&q=80" },
        { name: "Montagnes Brumeuses", url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80" }
    ],

    // ==========================================
    // 2. INITIALISATION
    // ==========================================
    init() {
        this.applySettings();
        this.applyBackground();
        this.bindEvents();
        this.renderAll();
        this.startBackgroundEngine();
        this.renderGallery();
        
        // Déverrouillage Audio au premier clic (Politique de sécurité Navigateurs)
        document.addEventListener('click', () => {
            if (!this.audioContext) this.audioContext = new AudioContext();
        }, { once: true });

        // Demande de permission Notifications
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    },

    save() {
        localStorage.setItem('ag_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('ag_notes', JSON.stringify(this.notes));
        localStorage.setItem('ag_alarms', JSON.stringify(this.alarms));
        localStorage.setItem('ag_settings', JSON.stringify(this.settings));
    },

    // ==========================================
    // 3. MOTEUR TEMPS RÉEL (ALARMES & HORLOGE)
    // ==========================================
    startBackgroundEngine() {
        const alarmPlayer = new Audio();
        alarmPlayer.loop = true;

        setInterval(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toISOString().split('T')[0];

            // Mise à jour de l'horloge UI
            const clock = document.getElementById('live-clock');
            if(clock) clock.textContent = timeStr;

            // 1. Vérification des Alarmes
            this.alarms.forEach(a => {
                if (a.enabled && a.time === timeStr && !a.ringing) {
                    this.triggerAlarm(a, alarmPlayer);
                }
            });

            // 2. Vérification des Rappels de Tâches
            const nowFull = `${dateStr}T${timeStr}`;
            this.tasks.forEach(t => {
                if (!t.completed && !t.notified && `${t.date}T${t.time}` <= nowFull) {
                    this.sendSystemNotify(t);
                    t.notified = true;
                    this.save();
                    this.renderTasks();
                }
            });
        }, 1000);
    },

    triggerAlarm(alarm, audioObj) {
        alarm.ringing = true;
        audioObj.src = alarm.sound || "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3";

        
        const screen = document.getElementById('alarm-overlay');
        document.getElementById('alarm-time-display').textContent = alarm.time;
        screen.classList.add('active');
        
        audioObj.play().catch(e => console.warn("L'audio attend un clic utilisateur."));

        document.getElementById('stop-alarm').onclick = () => {
            audioObj.pause();
            audioObj.currentTime = 0;
            screen.classList.remove('active');
            alarm.ringing = false;
            alarm.enabled = false; // Désactiver l'alarme après qu'elle a sonné
            this.save();
            this.renderAlarms();
        };
    },

    sendSystemNotify(task) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("AgStone", { 
                body: `URGENT : ${task.title}`, 
                icon: "img/logo.svg" 
            });
        }
    },

    // ==========================================
    // 4. LOGIQUE DES ÉVÉNEMENTS (INTERACTIONS)
    // ==========================================
    bindEvents() {
        // Navigation Inter-Pages
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(`${btn.dataset.page}-page`).classList.add('active');
                
                // Fermer l'éditeur de note si on quitte la page notepad
                if(btn.dataset.page !== 'notepad') this.closeNoteEditor();
            };
            // Variable pour stocker l'événement d'installation
            let deferredPrompt;

            window.addEventListener('beforeinstallprompt', (e) => {
                // Empêche Chrome d'afficher la bannière automatique
                e.preventDefault();
                deferredPrompt = e;
                console.log('Installation AgStone disponible.');
            });

            // Tu peux maintenant appeler cette fonction sur un bouton spécifique si tu veux
            function installApp() {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('Utilisateur a installé AgStone');
                        }
                        deferredPrompt = null;
                    });
                }
            }
        });

        // --- GESTION DES TÂCHES ---
        const taskModal = document.getElementById('task-modal');
        document.getElementById('desktop-add-btn').onclick = () => this.openTaskForm();
        document.getElementById('mobile-add-btn').onclick = () => this.openTaskForm();
        document.querySelector('#task-modal .close-modal').onclick = () => taskModal.classList.remove('active');
        
        document.getElementById('task-form').onsubmit = (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        };

        document.getElementById('delete-task-btn').onclick = () => {
            const id = document.getElementById('task-id').value;
            this.tasks = this.tasks.filter(t => t.id != id);
            this.save(); this.renderAll(); taskModal.classList.remove('active');
        };

        // --- GESTION DU BLOC-NOTES (CAHIER) ---
        document.getElementById('new-note-btn').onclick = () => this.createNewNote();
        document.getElementById('back-to-library').onclick = () => this.closeNoteEditor();
        
        document.getElementById('notepad-area').oninput = (e) => {
            const note = this.notes.find(n => n.id === this.activeNoteId);
            if(note) {
                note.content = e.target.value;
                document.getElementById('note-save-status').textContent = "Sauvegarde...";
                this.save();
                setTimeout(() => {
                    const status = document.getElementById('note-save-status');
                    if(status) status.textContent = "Enregistré";
                }, 800);
            }
        };

        document.getElementById('note-title-input').oninput = (e) => {
            const note = this.notes.find(n => n.id === this.activeNoteId);
            if(note) { note.title = e.target.value; this.save(); }
        };

        // --- GESTION DES ALARMES ---
        document.getElementById('add-alarm-btn').onclick = () => document.getElementById('alarm-modal').classList.add('active');
        document.querySelectorAll('#alarm-modal .close-modal').forEach(b => {
            b.onclick = () => document.getElementById('alarm-modal').classList.remove('active');
        });
        
        document.getElementById('test-sound-btn').onclick = () => {
            const sound = new Audio(document.getElementById('alarm-sound-select').value);
            sound.play();
            setTimeout(() => sound.pause(), 3000);
        };

        document.getElementById('alarm-form').onsubmit = (e) => {
            e.preventDefault();
            this.alarms.push({
                id: Date.now(),
                time: document.getElementById('alarm-time-input').value,
                sound: document.getElementById('alarm-sound-select').value,
                enabled: true, 
                ringing: false
            });
            this.save(); 
            this.renderAlarms();
            document.getElementById('alarm-modal').classList.remove('active');
        };

        // --- RÉGLAGES ET PERSONNALISATION ---
        document.getElementById('theme-select').onchange = (e) => { this.settings.theme = e.target.value; this.applySettings(); this.save(); };
        document.getElementById('font-select').onchange = (e) => { this.settings.font = e.target.value; this.applySettings(); this.save(); };
        document.getElementById('apply-bg').onclick = () => {
            this.settings.bgUrl = document.getElementById('bg-url-input').value;
            this.applyBackground(); this.save();
        };
        document.getElementById('bg-blur-range').oninput = (e) => {
            this.settings.blur = e.target.value;
            this.applyBackground(); this.save();
        };

        // Upload photo locale (Téléphone/PC)
        document.getElementById('bg-upload-input').onchange = (e) => {
            const file = e.target.files[0];
            if(file) {
                if(file.size > 2 * 1024 * 1024) return alert("Image trop lourde (Max 2Mo)");
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.settings.bgUrl = ev.target.result;
                    this.applyBackground();
                    this.save();
                };
                reader.readAsDataURL(file);
            }
        };

        // Filtres Dashboard
        document.querySelectorAll('.pill').forEach(p => {
            p.onclick = () => {
                document.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
                p.classList.add('active');
                this.currentFilter = p.dataset.filter;
                this.renderTasks();
            };
        });

        // Navigation Calendrier
        document.getElementById('prev-month').onclick = () => { this.calDate.setMonth(this.calDate.getMonth()-1); this.renderCalendar(); };
        document.getElementById('next-month').onclick = () => { this.calDate.setMonth(this.calDate.getMonth()+1); this.renderCalendar(); };

        // Export/Import
        document.getElementById('export-btn').onclick = () => {
            const data = { tasks: this.tasks, notes: this.notes, alarms: this.alarms, settings: this.settings };
            const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `agstone_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        };
        document.getElementById('import-trigger').onclick = () => document.getElementById('import-input').click();
        document.getElementById('import-input').onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    this.tasks = d.tasks || [];
                    this.notes = d.notes || [];
                    this.alarms = d.alarms || [];
                    this.settings = d.settings || this.settings;
                    this.save();
                    location.reload();
                } catch(err) { alert("Erreur de format de fichier."); }
            };
            reader.readAsText(e.target.files[0]);
        };
    },

    // ==========================================
    // 5. MOTEURS DE RENDU (DOM)
    // ==========================================
    renderTasks(query = "") {
        const list = document.getElementById('task-list');
        if(!list) return;
        list.innerHTML = "";

        let filtered = this.tasks.filter(t => {
            const match = t.title.toLowerCase().includes(query.toLowerCase());
            return this.currentFilter === 'all' ? match : (!t.completed && match);
        });

        filtered.sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));

        filtered.forEach(t => {
            const div = document.createElement('div');
            div.className = `task-item ${t.completed ? 'done' : ''}`;
            div.onclick = () => this.openTaskForm(t.id);
            div.innerHTML = `
                <input type="checkbox" ${t.completed ? 'checked' : ''} onclick="event.stopPropagation(); AgStone.toggleTask(${t.id})">
                <div style="flex:1"><strong>${t.title}</strong><br><small>${new Date(t.date).toLocaleDateString('fr-FR')} • ${t.time}</small></div>
                <div class="prio-dot prio-${t.priority}"></div>
            `;
            list.appendChild(div);
        });

        document.getElementById('stat-pending').textContent = this.tasks.filter(x => !x.completed).length;
        document.getElementById('stat-completed').textContent = this.tasks.filter(x => x.completed).length;
    },

    renderNotes() {
        const lib = document.getElementById('notes-library');
        if(!lib) return;
        lib.innerHTML = "";
        this.notes.forEach(n => {
            const div = document.createElement('div');
            div.className = "note-room";
            div.innerHTML = `
                <i class="bi bi-trash" style="position:absolute; right:10px; top:10px; cursor:pointer" onclick="event.stopPropagation(); AgStone.deleteNote(${n.id})"></i>
                <h4>${n.title}</h4>
                <p>${n.content.substring(0, 80)}...</p>
                <small style="margin-top:10px; display:block; opacity:0.5">${n.date}</small>
            `;
            div.onclick = () => this.openNoteEditor(n.id);
            lib.appendChild(div);
        });
    },

    renderAlarms() {
        const grid = document.getElementById('alarm-list');
        if(!grid) return;
        grid.innerHTML = "";
        this.alarms.forEach(a => {
            const card = document.createElement('div');
            card.className = "alarm-card";
            card.innerHTML = `
                <i class="bi bi-trash" style="position:absolute; top:10px; right:10px; color:var(--prio-urgent); cursor:pointer;" onclick="AgStone.deleteAlarm(${a.id})"></i>
                <div class="time">${a.time}</div>
                <p style="font-size:0.8rem; margin:5px 0;">Activée</p>
                <input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="AgStone.toggleAlarm(${a.id})">
            `;
            grid.appendChild(card);
        });
    },

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        if(!grid) return;
        grid.innerHTML = "";
        const now = this.calDate;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
        const startDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const offset = startDay === 0 ? 6 : startDay - 1;

        for(let i=0; i<offset; i++) grid.appendChild(document.createElement('div'));
        for(let i=1; i<=daysInMonth; i++) {
            const d = document.createElement('div');
            d.className = 'cal-day'; d.textContent = i;
            const dStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            if(this.tasks.some(t => t.date === dStr)) d.classList.add('has-task');
            if(i === new Date().getDate() && now.getMonth() === new Date().getMonth() && now.getFullYear() === new Date().getFullYear()) d.classList.add('today');
            grid.appendChild(d);
        }
        document.getElementById('cal-month-year').textContent = new Intl.DateTimeFormat('fr-FR', {month:'long', year:'numeric'}).format(now);
    },

    renderGallery() {
        const gal = document.getElementById('preset-gallery');
        if(!gal) return;
        gal.innerHTML = "";
        this.presets.forEach(p => {
            const d = document.createElement('div');
            d.className = "preset-thumb";
            d.style.backgroundImage = `url('${p.url}')`;
            d.onclick = () => { this.settings.bgUrl = p.url; this.applyBackground(); this.save(); };
            gal.appendChild(d);
        });
    },

    // ==========================================
    // 6. ACTIONS & FONCTIONS CORE
    // ==========================================
    createNewNote() {
        const n = { id: Date.now(), title: "Nouveau Carnet", content: "", date: new Date().toLocaleDateString() };
        this.notes.unshift(n); this.save(); this.openNoteEditor(n.id);
    },

    openNoteEditor(id) {
        this.activeNoteId = id;
        const n = this.notes.find(x => x.id === id);
        document.getElementById('note-title-input').value = n.title;
        document.getElementById('notepad-area').value = n.content;
        document.getElementById('notepad-library-view').style.display = 'none';
        document.getElementById('note-editor-view').style.display = 'flex';
    },

    closeNoteEditor() {
        this.activeNoteId = null;
        document.getElementById('notepad-library-view').style.display = 'block';
        document.getElementById('note-editor-view').style.display = 'none';
        this.renderNotes();
    },

    openTaskForm(id = null) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        form.reset();
        document.getElementById('task-id').value = id || '';
        document.getElementById('delete-task-btn').style.display = id ? 'block' : 'none';
        
        if(id) {
            const t = this.tasks.find(x => x.id == id);
            document.getElementById('task-title').value = t.title;
            document.getElementById('task-date').value = t.date;
            document.getElementById('task-time').value = t.time;
            document.getElementById('task-priority').value = t.priority;
        }
        modal.classList.add('active');
    },

    handleTaskSubmit() {
        const id = document.getElementById('task-id').value;
        const data = {
            id: id ? parseInt(id) : Date.now(),
            title: document.getElementById('task-title').value,
            date: document.getElementById('task-date').value,
            time: document.getElementById('task-time').value,
            priority: document.getElementById('task-priority').value,
            completed: id ? this.tasks.find(x => x.id == id).completed : false,
            notified: false
        };
        if(id) { const idx = this.tasks.findIndex(x => x.id == id); this.tasks[idx] = data; }
        else { this.tasks.push(data); }
        this.save(); this.renderAll(); 
        document.getElementById('task-modal').classList.remove('active');
    },

    toggleTask(id) { const t = this.tasks.find(x => x.id === id); t.completed = !t.completed; this.save(); this.renderAll(); },
    deleteNote(id) { if(confirm("Supprimer ce carnet ?")) { this.notes = this.notes.filter(n => n.id !== id); this.save(); this.renderNotes(); }},
    deleteAlarm(id) { this.alarms = this.alarms.filter(a => a.id !== id); this.save(); this.renderAlarms(); },
    toggleAlarm(id) { const a = this.alarms.find(x => x.id === id); a.enabled = !a.enabled; this.save(); },

    applySettings() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        document.documentElement.setAttribute('data-font', this.settings.font);
        document.getElementById('theme-select').value = this.settings.theme;
        document.getElementById('font-select').value = this.settings.font;
    },

    applyBackground() {
        if(this.settings.bgUrl) {
            document.body.classList.add('has-bg');
            document.documentElement.style.setProperty('--custom-bg', `url("${this.settings.bgUrl}")`);
            document.documentElement.style.setProperty('--blur-amount', this.settings.blur + 'px');
        } else {
            document.body.classList.remove('has-bg');
        }
    },

    renderAll() {
        this.renderTasks();
        this.renderNotes();
        this.renderAlarms();
        this.renderCalendar();
        this.renderGallery();
        document.getElementById('bg-url-input').value = this.settings.bgUrl;
        document.getElementById('bg-blur-range').value = this.settings.blur;
    }
};

// INITIALISATION DU SYSTÈME
document.addEventListener('DOMContentLoaded', () => AgStone.init());