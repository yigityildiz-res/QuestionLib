document.addEventListener('DOMContentLoaded', () => {

    // =====================================================
    // DOM REFERENCES
    // =====================================================

    // Screens
    const vaultScreen  = document.getElementById('vault-screen');
    const errorScreen  = document.getElementById('error-screen');
    const appContainer = document.getElementById('app');

    // Vault selection elements
    const vaultPathInput       = document.getElementById('vault-path-input');
    const vaultOpenBtn         = document.getElementById('vault-open-btn');
    const vaultBrowseBtn       = document.getElementById('vault-browse-btn');
    const savedVaultsSection   = document.getElementById('saved-vaults-section');
    const savedVaultsList      = document.getElementById('saved-vaults-list');
    const vaultStatus          = document.getElementById('vault-status');
    const activeVaultLabel     = document.getElementById('active-vault-label');
    const changeVaultBtn       = document.getElementById('change-vault-btn');

    // Error screen
    const errorTitle   = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    const errorBackBtn = document.getElementById('error-back-btn');

    // Sidebar
    const menuContainer  = document.getElementById('menu-container');
    const tabLibrary     = document.getElementById('tab-library');
    const tabReview      = document.getElementById('tab-review');
    const sidebarLibrary = document.getElementById('sidebar-library');
    const sidebarReview  = document.getElementById('sidebar-review');
    const libraryInfo    = document.getElementById('library-info');
    const reviewInfo     = document.getElementById('review-info');

    // Save manager
    const saveSelector = document.getElementById('save-selector');
    const newSaveBtn   = document.getElementById('new-save-btn');
    const hiddenCount  = document.getElementById('hidden-count');
    const courseFilters = document.getElementById('course-filters');

    // Review mode
    const reviewQuestionTitle    = document.getElementById('review-question-title');
    const reviewQuestionPath     = document.getElementById('review-question-path');
    const reviewImageContainer   = document.getElementById('review-image-container');
    const reviewQuestionImage    = document.getElementById('review-question-image');
    const answerButtons          = document.querySelectorAll('.answer-btn');
    const reviewFeedback         = document.getElementById('review-feedback');
    const showSolutionBtn        = document.getElementById('show-solution-btn');
    const nextQuestionBtn        = document.getElementById('next-question-btn');
    const hideQuestionBtn        = document.getElementById('hide-question-btn');

    // Video player
    const solutionPlayer  = document.getElementById('solution-player');
    const videoPlaceholder = document.getElementById('video-placeholder');
    const videoTitle      = document.getElementById('video-title');
    const videoPathText   = document.getElementById('video-path-text');

    // =====================================================
    // APPLICATION STATE
    // =====================================================
    const state = {
        data:                  null,
        activeQuestionId:      null,
        currentMode:           'library',
        saves:                 { 'save1': [] },
        currentSave:           'save1',
        reviewPool:            [],
        currentReviewQuestion: null,
        activeVaultPath:       null,
    };

    // localStorage keys
    const LS_SAVES  = 'ql_saves';
    const LS_VAULTS = 'ql_vaults';

    // One-time setup flags to prevent duplicate event listeners
    let delegationSetup    = false;
    let modeListenersSetup = false;

    // =====================================================
    // INITIALIZATION
    // =====================================================
    function init() {
        showScreen('vault');
        renderSavedVaults();

        // Pre-fill the input with the most recently used vault
        const vaults = loadVaultHistory();
        if (vaults.length > 0) {
            vaultPathInput.value = vaults[0];
        }
    }

    // =====================================================
    // SCREEN MANAGEMENT
    // =====================================================
    function showScreen(screen) {
        vaultScreen.classList.toggle('hidden', screen !== 'vault');
        errorScreen.classList.toggle('hidden', screen !== 'error');
        appContainer.classList.toggle('hidden', screen !== 'app');
    }

    function showError(title, message) {
        errorTitle.innerHTML   = title;
        errorMessage.innerHTML = message;
        showScreen('error');
    }

    errorBackBtn.addEventListener('click', () => {
        showScreen('vault');
        setVaultStatus('', '');
    });

    // =====================================================
    // VAULT HISTORY (localStorage)
    // =====================================================
    function loadVaultHistory() {
        try {
            return JSON.parse(localStorage.getItem(LS_VAULTS)) || [];
        } catch {
            return [];
        }
    }

    function saveVaultToHistory(path) {
        let vaults = loadVaultHistory().filter(v => v !== path);
        vaults.unshift(path);          // Most recent first
        vaults = vaults.slice(0, 10); // Cap at 10 entries
        localStorage.setItem(LS_VAULTS, JSON.stringify(vaults));
    }

    function removeVaultFromHistory(path) {
        const vaults = loadVaultHistory().filter(v => v !== path);
        localStorage.setItem(LS_VAULTS, JSON.stringify(vaults));
    }

    // =====================================================
    // VAULT SELECTION UI
    // =====================================================
    function renderSavedVaults() {
        const vaults = loadVaultHistory();
        if (vaults.length === 0) {
            savedVaultsSection.classList.add('hidden');
            return;
        }

        savedVaultsSection.classList.remove('hidden');
        savedVaultsList.innerHTML = '';

        vaults.forEach(vaultPath => {
            const folderName = vaultPath.split(/[\\\/]/).pop() || vaultPath;
            const li = document.createElement('li');
            li.className = 'saved-vault-item';
            li.innerHTML = `
                <button class="saved-vault-open" data-path="${vaultPath}" title="${vaultPath}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    <span class="saved-vault-name">${folderName}</span>
                    <span class="saved-vault-path">${vaultPath}</span>
                </button>
                <button class="saved-vault-remove" data-path="${vaultPath}" title="Remove from list">✕</button>
            `;
            savedVaultsList.appendChild(li);
        });

        savedVaultsList.querySelectorAll('.saved-vault-open').forEach(btn => {
            btn.addEventListener('click', () => openVault(btn.dataset.path));
        });

        savedVaultsList.querySelectorAll('.saved-vault-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeVaultFromHistory(btn.dataset.path);
                renderSavedVaults();
            });
        });
    }

    function setVaultStatus(type, message) {
        if (!message) {
            vaultStatus.className   = 'vault-status hidden';
            vaultStatus.textContent = '';
            return;
        }
        vaultStatus.className   = `vault-status ${type}`;
        vaultStatus.textContent = message;
    }

    // Browse button — opens a native folder picker via the server
    vaultBrowseBtn.addEventListener('click', browseFolder);

    // Open button — opens the typed vault path
    vaultOpenBtn.addEventListener('click', () => {
        const path = vaultPathInput.value.trim();
        if (!path) {
            setVaultStatus('error', 'Please enter a folder path.');
            return;
        }
        openVault(path);
    });

    vaultPathInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') vaultOpenBtn.click();
    });

    // =====================================================
    // FOLDER BROWSER (native dialog via tkinter)
    // =====================================================
    async function browseFolder() {
        vaultBrowseBtn.disabled     = true;
        vaultBrowseBtn.textContent  = '...';
        setVaultStatus('loading', 'Opening folder picker...');
        try {
            const res  = await fetch('/api/browse');
            const data = await res.json();
            if (data.path) {
                vaultPathInput.value = data.path;
                setVaultStatus('', '');
                openVault(data.path);
            } else {
                // User cancelled the dialog
                setVaultStatus('', '');
            }
        } catch (err) {
            setVaultStatus('error', 'Browse failed: ' + err.message);
        } finally {
            vaultBrowseBtn.disabled  = false;
            vaultBrowseBtn.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg> Browse`;
        }
    }

    // Change Vault button (inside the main app)
    changeVaultBtn.addEventListener('click', () => {
        solutionPlayer.pause();
        solutionPlayer.src    = '';
        menuContainer.innerHTML  = '';
        courseFilters.innerHTML  = '';
        state.data            = null;
        state.activeVaultPath = null;
        renderSavedVaults();
        setVaultStatus('', '');
        vaultPathInput.value = '';
        showScreen('vault');
    });

    // =====================================================
    // VAULT OPEN & SCAN
    // =====================================================
    async function openVault(vaultPath) {
        vaultOpenBtn.disabled = true;
        setVaultStatus('loading', `Scanning: ${vaultPath}`);

        try {
            const url      = `/api/scan?path=${encodeURIComponent(vaultPath)}`;
            const response = await fetch(url);
            const jsonData = await response.json();

            if (!response.ok) {
                throw new Error(jsonData.error || `HTTP ${response.status}`);
            }

            if (!jsonData || jsonData.length === 0) {
                throw new Error(
                    'No recognised video files found in this folder.\n\n' +
                    'Expected structure: VaultFolder/Course/Unit/video.mp4'
                );
            }

            // Success — store state and launch the app
            state.data            = jsonData;
            state.activeVaultPath = vaultPath;

            saveVaultToHistory(vaultPath);
            renderSavedVaults();

            setupApp(jsonData, vaultPath);

        } catch (error) {
            console.error('Failed to open vault:', error);
            setVaultStatus('error', `Error: ${error.message}`);
        } finally {
            vaultOpenBtn.disabled = false;
        }
    }

    // =====================================================
    // APP SETUP (called after a vault is successfully opened)
    // =====================================================
    function setupApp(data, vaultPath) {
        // Reset and rebuild the menu and filters
        menuContainer.innerHTML  = '';
        courseFilters.innerHTML  = '';

        buildMenu(data);
        buildCourseFilters(data);
        loadSaves();
        setupEventDelegation();
        setupModeEventListeners();

        // Update the active vault label in the sidebar header
        const folderName = vaultPath.split(/[\\\/]/).pop() || vaultPath;
        activeVaultLabel.textContent = folderName;
        activeVaultLabel.title       = vaultPath;

        switchMode('library');
        showScreen('app');
        setVaultStatus('', '');
    }

    // =====================================================
    // SAVE SLOT MANAGEMENT
    // =====================================================
    function loadSaves() {
        const savedData = localStorage.getItem(LS_SAVES);
        if (savedData) {
            try {
                const parsed     = JSON.parse(savedData);
                state.saves      = parsed.saves       || { 'save1': [] };
                state.currentSave = parsed.currentSave || 'save1';
            } catch {
                console.warn('Could not read save data — resetting.');
            }
        }
        updateSaveUI();
    }

    function persistSaves() {
        localStorage.setItem(LS_SAVES, JSON.stringify({
            saves:       state.saves,
            currentSave: state.currentSave,
        }));
        updateSaveUI();
    }

    function updateSaveUI() {
        saveSelector.innerHTML = '';
        Object.keys(state.saves).forEach(saveName => {
            const opt        = document.createElement('option');
            opt.value        = saveName;
            opt.textContent  = saveName === 'save1'
                ? 'Save 1 (Main)'
                : `Save ${saveName.replace('save', '')}`;
            if (saveName === state.currentSave) opt.selected = true;
            saveSelector.appendChild(opt);
        });

        const hiddenIds = state.saves[state.currentSave] || [];
        hiddenCount.textContent = hiddenIds.length;
    }

    // =====================================================
    // MENU BUILDER (accordion)
    // =====================================================
    function buildMenu(data) {
        const chevronIcon = `<svg class="accordion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
        const playIcon    = `<svg class="question-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 18 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

        let html = '';

        data.forEach(course => {
            html += `<div class="accordion-item level-1">
                <button class="accordion-header" aria-expanded="false">
                    <span>${course.title}</span>
                    ${chevronIcon}
                </button>
                <div class="accordion-content">`;

            (course.units || []).forEach(unit => {
                html += `<div class="accordion-item level-2">
                    <button class="accordion-header" aria-expanded="false">
                        <span>${unit.title}</span>
                        ${chevronIcon}
                    </button>
                    <div class="accordion-content">`;

                (unit.tests || []).forEach(test => {
                    html += `<div class="accordion-item level-3">
                        <button class="accordion-header" aria-expanded="false">
                            <span>${test.title}</span>
                            ${chevronIcon}
                        </button>
                        <div class="accordion-content">`;

                    (test.questions || []).forEach(question => {
                        const breadcrumb = `${course.title} > ${unit.title} > ${test.title} > ${question.title}`;
                        html += `<div class="level-4">
                            <button class="question-item"
                                data-id="${question.id}"
                                data-src="${question.video}"
                                data-title="${breadcrumb}">
                                ${playIcon}
                                <span>${question.title}</span>
                            </button>
                        </div>`;
                    });

                    html += `</div></div>`;
                });

                html += `</div></div>`;
            });

            html += `</div></div>`;
        });

        // Use a document fragment for a single, efficient DOM insertion
        const tempDiv  = document.createElement('div');
        tempDiv.innerHTML = html;
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
        menuContainer.appendChild(fragment);
    }

    function buildCourseFilters(data) {
        courseFilters.innerHTML = '';
        data.forEach(course => {
            const label    = document.createElement('label');
            label.className = 'filter-label';

            const checkbox       = document.createElement('input');
            checkbox.type        = 'checkbox';
            checkbox.className   = 'filter-checkbox';
            checkbox.value       = course.id;
            checkbox.checked     = true;

            checkbox.addEventListener('change', () => {
                buildReviewPool();
                loadRandomQuestion();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(course.title));
            courseFilters.appendChild(label);
        });
    }

    // =====================================================
    // EVENT LISTENERS
    // =====================================================
    function setupEventDelegation() {
        if (delegationSetup) return;
        delegationSetup = true;

        menuContainer.addEventListener('click', (e) => {
            const headerBtn   = e.target.closest('.accordion-header');
            if (headerBtn)   { toggleAccordion(headerBtn); return; }

            const questionBtn = e.target.closest('.question-item');
            if (questionBtn) { playVideo(questionBtn); }
        });
    }

    function setupModeEventListeners() {
        if (modeListenersSetup) return;
        modeListenersSetup = true;

        tabLibrary.addEventListener('click', () => switchMode('library'));
        tabReview.addEventListener('click',  () => switchMode('review'));

        saveSelector.addEventListener('change', (e) => {
            state.currentSave = e.target.value;
            persistSaves();
            buildReviewPool();
            loadRandomQuestion();
        });

        newSaveBtn.addEventListener('click', () => {
            const newIndex   = Object.keys(state.saves).length + 1;
            const newSaveName = `save${newIndex}`;
            state.saves[newSaveName] = [];
            state.currentSave        = newSaveName;
            persistSaves();
            buildReviewPool();
            loadRandomQuestion();
        });

        answerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                handleAnswer(btn.getAttribute('data-answer'), btn);
            });
        });

        showSolutionBtn.addEventListener('click',  showReviewSolution);
        nextQuestionBtn.addEventListener('click',  loadRandomQuestion);
        hideQuestionBtn.addEventListener('click',  hideCurrentQuestion);
    }

    // =====================================================
    // MODE SWITCHING
    // =====================================================
    function switchMode(mode) {
        state.currentMode = mode;

        if (mode === 'library') {
            tabLibrary.classList.add('active');
            tabReview.classList.remove('active');
            sidebarLibrary.classList.remove('hidden');
            sidebarReview.classList.add('hidden');
            libraryInfo.classList.remove('hidden');
            reviewInfo.classList.add('hidden');

            // Show the player only if a question was previously selected
            const hasActiveQuestion = Boolean(state.activeQuestionId);
            solutionPlayer.classList.toggle('active', hasActiveQuestion);
            videoPlaceholder.classList.toggle('hidden', hasActiveQuestion);

        } else {
            tabReview.classList.add('active');
            tabLibrary.classList.remove('active');
            sidebarReview.classList.remove('hidden');
            sidebarLibrary.classList.add('hidden');
            reviewInfo.classList.remove('hidden');
            libraryInfo.classList.add('hidden');

            solutionPlayer.pause();
            solutionPlayer.classList.remove('active');
            videoPlaceholder.classList.remove('hidden');

            buildReviewPool();
            loadRandomQuestion();
        }
    }

    // =====================================================
    // REVIEW MODE
    // =====================================================
    function buildReviewPool() {
        state.reviewPool = [];

        const hiddenIds = state.saves[state.currentSave] || [];
        const selectedCourseIds = Array.from(
            document.querySelectorAll('.filter-checkbox:checked')
        ).map(cb => cb.value);

        state.data.forEach(course => {
            if (!selectedCourseIds.includes(course.id)) return;
            (course.units || []).forEach(unit => {
                (unit.tests || []).forEach(test => {
                    (test.questions || []).forEach(question => {
                        if (!hiddenIds.includes(question.id)) {
                            state.reviewPool.push({
                                ...question,
                                path: `${course.title} > ${unit.title} > ${test.title}`,
                            });
                        }
                    });
                });
            });
        });

        // Shuffle using the Fisher-Yates algorithm
        for (let i = state.reviewPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.reviewPool[i], state.reviewPool[j]] = [state.reviewPool[j], state.reviewPool[i]];
        }
    }

    function loadRandomQuestion() {
        // Reset answer UI state
        reviewFeedback.className  = 'feedback-message hidden';
        reviewFeedback.innerHTML  = '';
        showSolutionBtn.classList.add('hidden');
        answerButtons.forEach(btn => {
            btn.classList.remove('selected', 'correct', 'wrong');
            btn.disabled = false;
        });

        // Reset video
        solutionPlayer.pause();
        solutionPlayer.classList.remove('active');
        videoPlaceholder.classList.remove('hidden');

        // Reset image
        reviewImageContainer.classList.add('hidden');
        reviewQuestionImage.src = '';

        if (state.reviewPool.length === 0) {
            reviewQuestionTitle.textContent = 'No Questions Left!';
            reviewQuestionPath.textContent  = 'All questions are hidden or the pool is empty.';
            state.currentReviewQuestion     = null;
            return;
        }

        const question = state.reviewPool.pop();
        state.currentReviewQuestion = question;

        reviewQuestionTitle.textContent = question.title;
        reviewQuestionPath.textContent  = question.path;

        if (question.image) {
            reviewQuestionImage.src = question.image;
            reviewImageContainer.classList.remove('hidden');
        }
    }

    function handleAnswer(selectedAnswer, clickedBtn) {
        if (!state.currentReviewQuestion) return;

        // Lock all answer buttons
        answerButtons.forEach(b => (b.disabled = true));
        clickedBtn.classList.add('selected');

        const question = state.currentReviewQuestion;

        if (!question.answer) {
            reviewFeedback.textContent = 'No answer recorded for this question. Watch the solution to check.';
            reviewFeedback.className   = 'feedback-message info';
        } else if (question.answer === selectedAnswer) {
            reviewFeedback.textContent = 'Correct!';
            reviewFeedback.className   = 'feedback-message success';
            clickedBtn.classList.add('correct');
        } else {
            reviewFeedback.textContent = `Wrong. The correct answer is: ${question.answer}`;
            reviewFeedback.className   = 'feedback-message error';
            clickedBtn.classList.add('wrong');
            // Highlight the correct answer
            answerButtons.forEach(b => {
                if (b.getAttribute('data-answer') === question.answer) {
                    b.classList.add('correct');
                }
            });
        }

        showSolutionBtn.classList.remove('hidden');
    }

    function showReviewSolution() {
        if (!state.currentReviewQuestion) return;
        videoPlaceholder.classList.add('hidden');
        solutionPlayer.classList.add('active');
        solutionPlayer.src = state.currentReviewQuestion.video;
        solutionPlayer.play().catch(e => console.warn('Autoplay blocked:', e));
    }

    function hideCurrentQuestion() {
        if (!state.currentReviewQuestion) return;
        const questionId = state.currentReviewQuestion.id;
        if (!state.saves[state.currentSave].includes(questionId)) {
            state.saves[state.currentSave].push(questionId);
            persistSaves();
        }
        loadRandomQuestion();
    }

    // =====================================================
    // ACCORDION & VIDEO PLAYER
    // =====================================================
    function toggleAccordion(headerBtn) {
        const content    = headerBtn.nextElementSibling;
        const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            headerBtn.setAttribute('aria-expanded', 'false');
            content.style.maxHeight = null;
            content.style.opacity   = '0';
        } else {
            headerBtn.setAttribute('aria-expanded', 'true');
            content.style.maxHeight = content.scrollHeight + 300 + 'px';
            content.style.opacity   = '1';
        }
    }

    function playVideo(btn) {
        // Deactivate the previously selected question
        const prevActive = document.querySelector('.question-item.active');
        if (prevActive) prevActive.classList.remove('active');
        btn.classList.add('active');

        const videoSrc     = btn.getAttribute('data-src');
        const questionTitle = btn.getAttribute('data-title');
        state.activeQuestionId = btn.getAttribute('data-id');

        videoPlaceholder.classList.add('hidden');
        solutionPlayer.classList.add('active');

        videoTitle.textContent   = questionTitle;
        videoPathText.textContent = `File: ${videoSrc}`;

        solutionPlayer.src = videoSrc;
        solutionPlayer.play().catch(error => {
            console.warn('Autoplay blocked by browser:', error);
        });
    }

    // =====================================================
    // START
    // =====================================================
    init();
});
