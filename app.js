const STATE = {
    accounts: JSON.parse(localStorage.getItem('bpr_accounts')) || [],
    transactions: JSON.parse(localStorage.getItem('bpr_transactions')) || [],
    users: JSON.parse(localStorage.getItem('bpr_users')) || [],
    currentUser: JSON.parse(localStorage.getItem('bpr_logged_user')) || null
};

const CATEGORIES = {
    income: [
        { id: 't_kendi', label: 'Kendimin Gelirleri' },
        { id: 't_esim', label: 'Eşimden Aldığım' },
        { id: 't_oglum', label: 'Oğlumdan Aldığım' },
        { id: 't_diger', label: 'Diğer Tahsilatlar' }
    ],
    expense: [
        { id: 'e_ev', label: 'Ev Giderleri' },
        { id: 'e_genel', label: 'Genel Harcama' },
        { id: 'e_sahsi', label: 'Şahsi Harcamalar' },
        { id: 'e_yatirim', label: 'Yatırım / Emanet' },
        { id: 'e_diger', label: 'Diğer Tediyeler' }
    ],
    transfer: [
        { id: 'v_virman', label: 'Virman (Hesaplar Arası)' }
    ]
};

// --- Authentication Logic ---
function initAuth() {
    if (STATE.currentUser) {
        // Logged in
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('logged-user-name').innerText = STATE.currentUser.name;
        updateUI();
    } else {
        // Not logged in
        document.getElementById('auth-overlay').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        switchAuthView('login');
    }
}

function switchAuthView(viewId) {
    document.querySelectorAll('.auth-box').forEach(box => box.classList.add('hidden'));
    document.getElementById(`box-${viewId}`).classList.remove('hidden');
    document.getElementById('recovery-result').classList.add('hidden');
}

// Register
document.getElementById('form-register').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const user = document.getElementById('reg-user').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value;
    const question = document.getElementById('reg-question').value;
    const answer = document.getElementById('reg-answer').value.trim().toLowerCase();

    if (STATE.users.find(u => u.username === user)) {
        alert("Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane seçin.");
        return;
    }

    const newUser = { name, username: user, password: pass, question, answer };
    STATE.users.push(newUser);
    localStorage.setItem('bpr_users', JSON.stringify(STATE.users));

    // Auto login
    doLogin(newUser);
    document.getElementById('form-register').reset();
});

// Login
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;

    const foundUser = STATE.users.find(u => u.username === user && u.password === pass);

    if (foundUser) {
        doLogin(foundUser);
        document.getElementById('form-login').reset();
    } else {
        alert("Kullanıcı adı veya şifre hatalı!");
    }
});

function doLogin(userObj) {
    STATE.currentUser = { name: userObj.name, username: userObj.username };
    localStorage.setItem('bpr_logged_user', JSON.stringify(STATE.currentUser));
    initAuth();
}

function logout() {
    STATE.currentUser = null;
    localStorage.removeItem('bpr_logged_user');
    initAuth();
}

// Forgot Password
document.getElementById('form-forgot').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('forgot-user').value.trim().toLowerCase();
    const answer = document.getElementById('forgot-answer').value.trim().toLowerCase();
    
    const foundUser = STATE.users.find(u => u.username === user);
    const resultBox = document.getElementById('recovery-result');

    if (!foundUser) {
        alert("Böyle bir kullanıcı adı bulunamadı.");
        return;
    }

    if (foundUser.answer === answer) {
        resultBox.innerHTML = `Hesabınız doğrulandı.<br>Şifreniz: <strong>${foundUser.password}</strong>`;
        resultBox.classList.remove('hidden');
    } else {
        alert("Güvenlik cevabı yanlış!");
        resultBox.classList.add('hidden');
    }
});

// --- Camera & Image Handling ---
let cameraStream = null;

function openCamera() {
    const video = document.getElementById('camera-video');
    const container = document.getElementById('camera-container');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(function(stream) {
                cameraStream = stream;
                video.srcObject = stream;
                container.classList.remove('hidden');
            })
            .catch(function(err) {
                alert("Kameraya erişilemedi: " + err);
            });
    } else {
        alert("Tarayıcınız kamera özelliğini desteklemiyor.");
    }
}

function closeCamera() {
    const container = document.getElementById('camera-container');
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    container.classList.add('hidden');
}

function takeSnapshot() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Compress image to Base64 (JPEG, 50% quality to save localStorage space)
    const base64Data = canvas.toDataURL('image/jpeg', 0.5);
    
    setReceiptData(base64Data);
    closeCamera();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Compress uploaded image via canvas
            const canvas = document.getElementById('camera-canvas');
            const ctx = canvas.getContext('2d');
            
            // max width/height to prevent huge files
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const base64Data = canvas.toDataURL('image/jpeg', 0.5);
            setReceiptData(base64Data);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function setReceiptData(base64Str) {
    document.getElementById('tx-receipt-data').value = base64Str;
    document.getElementById('receipt-preview-img').src = base64Str;
    document.getElementById('receipt-preview-container').classList.remove('hidden');
}

function removeReceipt() {
    document.getElementById('tx-receipt-data').value = '';
    document.getElementById('receipt-preview-img').src = '';
    document.getElementById('receipt-preview-container').classList.add('hidden');
    document.getElementById('tx-receipt-file').value = '';
}

function showFullImage(base64Str) {
    const imgViewer = document.getElementById('image-viewer-img');
    imgViewer.src = base64Str;
    document.getElementById('image-modal').classList.add('show');
}

// --- Excel/CSV Import Logic ---
let pendingExcelData = [];

function triggerExcelImport() {
    if (STATE.accounts.length === 0) {
        alert("Lütfen önce bir hesap açınız.");
        return;
    }
    document.getElementById('excel-file-input').click();
}

function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON array (defval: '' ensures empty cells aren't undefined)
            // Use header: 1 to get an array of arrays representing rows
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            if (rows.length < 2) {
                alert("Dosya boş veya uygun formatta değil.");
                return;
            }

            // Assume first row is headers
            const headers = rows[0];
            
            // The rest are data rows
            // Map array of arrays to array of objects using headers
            pendingExcelData = [];
            for (let i = 1; i < rows.length; i++) {
                const rowObj = {};
                let hasData = false;
                for (let j = 0; j < headers.length; j++) {
                    const headerStr = headers[j] ? String(headers[j]).trim() : `Sütun ${j+1}`;
                    rowObj[headerStr] = rows[i][j];
                    if (rows[i][j] !== '') hasData = true;
                }
                if (hasData) pendingExcelData.push(rowObj);
            }

            if (pendingExcelData.length === 0) {
                alert("Okunabilir veri bulunamadı.");
                return;
            }

            setupMappingModal(headers, pendingExcelData.length);
            
        } catch (err) {
            alert("Dosya okuma hatası: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so the same file can be selected again
    event.target.value = '';
}

function setupMappingModal(headers, rowCount) {
    const mapTargetAcc = document.getElementById('map-target-account');
    const selDate = document.getElementById('map-col-date');
    const selAmount = document.getElementById('map-col-amount');
    const selDesc = document.getElementById('map-col-desc');
    const selParty = document.getElementById('map-col-party');
    
    // Accounts
    mapTargetAcc.innerHTML = '';
    STATE.accounts.forEach(acc => {
        mapTargetAcc.innerHTML += `<option value="${acc.id}">${acc.name} (${formatMoney(acc.balance)})</option>`;
    });

    const populateDropdown = (selectEl, includeEmpty = false) => {
        let opts = includeEmpty ? '<option value="">-- Boş Bırak (Kullanma) --</option>' : '';
        headers.forEach(h => {
            const headerStr = h ? String(h).trim() : 'Bilinmeyen Sütun';
            opts += `<option value="${headerStr}">${headerStr}</option>`;
        });
        selectEl.innerHTML = opts;
    };

    populateDropdown(selDate);
    populateDropdown(selAmount);
    populateDropdown(selDesc);
    populateDropdown(selParty, true);

    // Auto-guess columns based on common Turkish bank terms
    headers.forEach(h => {
        if (!h) return;
        const lowerH = String(h).toLowerCase();
        if (lowerH.includes('tarih')) selDate.value = String(h).trim();
        else if (lowerH.includes('tutar') || lowerH.includes('bakiye')) selAmount.value = String(h).trim();
        else if (lowerH.includes('açıklama') || lowerH.includes('aciklama') || lowerH.includes('işlem')) selDesc.value = String(h).trim();
    });

    document.getElementById('mapping-stats').innerText = `Excel dosyasında toplam ${rowCount} satır (işlem) bulundu. İşlemler mevcut bakiyenizi güncelleyecektir.`;
    
    openModal('mapping-modal');
}

document.getElementById('form-mapping').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const accId = document.getElementById('map-target-account').value;
    const colDate = document.getElementById('map-col-date').value;
    const colAmount = document.getElementById('map-col-amount').value;
    const colDesc = document.getElementById('map-col-desc').value;
    const colParty = document.getElementById('map-col-party').value;

    const account = STATE.accounts.find(a => a.id === accId);
    if (!account) return;

    let successCount = 0;

    pendingExcelData.forEach(row => {
        try {
            // Excel dates can sometimes be numbers (serial dates)
            let parsedDate = row[colDate];
            if (typeof parsedDate === 'number') {
                // Convert Excel serial date to YYYY-MM-DD
                const dateObj = new Date(Math.round((parsedDate - 25569) * 86400 * 1000));
                parsedDate = dateObj.toISOString().split('T')[0];
            } else if (typeof parsedDate === 'string') {
                // Try to parse typical DD.MM.YYYY string
                const parts = parsedDate.split(/[./-]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) { // YYYY.MM.DD
                        parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    } else { // DD.MM.YYYY
                        parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
            }
            if (!parsedDate || isNaN(new Date(parsedDate).getTime())) {
                parsedDate = new Date().toISOString().split('T')[0]; // fallback to today
            }

            // Tutar parsing
            let rawAmount = String(row[colAmount] || '0').replace(/\s/g, '');
            // Convert TR number string format (e.g. 1.500,50 or 1500,50 or -1500.50)
            if (rawAmount.includes(',') && rawAmount.includes('.')) {
                rawAmount = rawAmount.replace(/\./g, '').replace(',', '.'); // 1.500,50 -> 1500.50
            } else if (rawAmount.includes(',')) {
                rawAmount = rawAmount.replace(',', '.'); // 1500,50 -> 1500.50
            }
            const amountVal = parseFloat(rawAmount);
            
            if (isNaN(amountVal) || amountVal === 0) return; // skip empty/invalid amounts

            const isIncome = amountVal > 0;
            const absoluteAmount = Math.abs(amountVal);

            const txType = isIncome ? 'income' : 'expense';
            const catFallback = isIncome ? 't_diger' : 'e_diger';

            const partyStr = colParty && row[colParty] ? String(row[colParty]).trim() : null;
            const descStr = colDesc && row[colDesc] ? String(row[colDesc]).trim() : '';

            // Apply to account
            if (isIncome) account.balance += absoluteAmount;
            else account.balance -= absoluteAmount;

            STATE.transactions.push({
                id: generateId(),
                type: txType,
                date: parsedDate,
                category: catFallback, // Default via Excel
                party: partyStr,
                accountId: accId,
                accountToId: null,
                amount: absoluteAmount,
                desc: '[Excel] ' + descStr,
                receipt: ''
            });

            successCount++;
        } catch(ex) {
            console.warn("Row skipping on error: ", ex);
        }
    });

    saveState();
    closeModal('mapping-modal');
    updateUI();
    alert(`${successCount} adet işlem başarıyla içeri aktarıldı ve muhasebeleştirildi.`);
});

// --- General Utilities ---
function saveState() {
    try {
        localStorage.setItem('bpr_accounts', JSON.stringify(STATE.accounts));
        localStorage.setItem('bpr_transactions', JSON.stringify(STATE.transactions));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert("Yerel depolama alanı doldu! Lütfen eski fişli işlemleri silin veya daha az belge yükleyin.");
        }
    }
}

function formatMoney(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Navigation
document.querySelectorAll('.nav-links li').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const viewId = e.currentTarget.getAttribute('data-view');
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active', 'hidden'));
        document.querySelectorAll('.view-section').forEach(sec => {
            if(sec.id !== `view-${viewId}`) sec.classList.add('hidden');
            else sec.classList.add('active');
        });

        document.getElementById('page-title').innerText = e.currentTarget.innerText.trim();

        if (viewId === 'reports') initReports();
    });
});

// Modals
function openModal(id, extra = null) {
    if (id === 'transaction-modal') {
        if (STATE.accounts.length === 0) {
            alert("Lütfen önce bir hesap açınız.");
            return;
        }
        if (extra === 'transfer' && STATE.accounts.length < 2) {
            alert("Virman (Transfer) yapabilmek için en az 2 hesabınızın olması gerekir.");
            return;
        }
        setupTransactionForm(extra); // income, expense, transfer
    }
    
    // For account modal resets
    if (id === 'account-modal') {
        toggleIbanField();
        toggleSubCreditFields();
        toggleDueDateField();
    }
    
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
    if(id === 'account-modal') document.getElementById('form-account').reset();
    if(id === 'transaction-modal') {
        document.getElementById('form-transaction').reset();
        removeReceipt();
        closeCamera();
    }
}

// Close on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
        if (event.target.id === 'transaction-modal') {
            closeCamera();
        }
    }
}

// --- Account Setup Logic ---
function toggleIbanField() {
    const type = document.getElementById('acc-type').value;
    const ibanGroup = document.getElementById('iban-group');
    const creditGroup = document.getElementById('sub-credit-group');
    const subCreditFields = document.getElementById('sub-credit-fields');
    
    if (type === 'bank') {
        ibanGroup.classList.remove('hidden');
        creditGroup.classList.remove('hidden');
    } else {
        ibanGroup.classList.add('hidden');
        creditGroup.classList.add('hidden');
        document.getElementById('acc-has-credit').checked = false;
        subCreditFields.classList.add('hidden');
    }
    toggleDueDateField();
}

function toggleDueDateField() {
    const type = document.getElementById('acc-type').value;
    const balance = parseFloat(document.getElementById('acc-balance').value) || 0;
    const dueDateGroup = document.getElementById('due-date-group');
    
    if (type === 'credit' || balance < 0) {
        dueDateGroup.classList.remove('hidden');
    } else {
        dueDateGroup.classList.add('hidden');
    }
}

function toggleSubCreditFields() {
    const isChecked = document.getElementById('acc-has-credit').checked;
    const fields = document.getElementById('sub-credit-fields');
    if (isChecked) {
        fields.classList.remove('hidden');
    } else {
        fields.classList.add('hidden');
    }
}

// Handle Account Form
document.getElementById('form-account').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('acc-name').value;
    const type = document.getElementById('acc-type').value;
    const balance = parseFloat(document.getElementById('acc-balance').value);
    const dueDate = document.getElementById('acc-due-date').value || null;
    
    let iban = null;
    if (type === 'bank') {
        iban = document.getElementById('acc-iban').value.trim();
    }
    
    // Asıl Hesabı Yarat
    const mainAccountId = generateId();
    STATE.accounts.push({
        id: mainAccountId,
        name,
        type,
        balance,
        iban: iban,
        dueDate: dueDate,
        parentId: null
    });
    
    // Eğer banka hesabı ise ve Alt Kredi Kartı istendiyse yarat
    if (type === 'bank' && document.getElementById('acc-has-credit').checked) {
        const ccBalance = parseFloat(document.getElementById('acc-credit-balance').value) || 0;
        const ccDueDate = document.getElementById('acc-credit-due-date').value || null;
        STATE.accounts.push({
            id: generateId(),
            name: name + ' (Kredi Kartı)',
            type: 'credit',
            balance: ccBalance,
            iban: null,
            dueDate: ccDueDate,
            parentId: mainAccountId // Ana banka hesabına bağla
        });
    }
    
    saveState();
    closeModal('account-modal');
    updateUI();
});

// --- Transaction Setup Logic ---
function setupTransactionForm(type) {
    const titleObj = document.getElementById('tx-modal-title');
    const catSelect = document.getElementById('tx-category');
    const accSelect = document.getElementById('tx-account');
    const accToSelect = document.getElementById('tx-account-to');
    const typeInput = document.getElementById('tx-type');
    
    const catGroup = document.getElementById('group-category');
    const partyGroup = document.getElementById('group-party');
    const lblParty = document.getElementById('lbl-tx-party');
    const accToGroup = document.getElementById('group-account-to');
    const lblAcc = document.getElementById('lbl-tx-account');
    const transferWarn = document.getElementById('transfer-warning');
    
    document.getElementById('tx-date').valueAsDate = new Date();
    typeInput.value = type;
    
    // UI adjustments based on simple accounting type
    if (type === 'income') {
        titleObj.innerText = 'Tahsilat Fişi (Para Girişi)';
        lblAcc.innerText = 'Para Girecek Hesap (Kasa/Banka)';
        lblParty.innerText = 'Kimden Alındı? (Kişi / Kurum)';
        catGroup.classList.remove('hidden');
        partyGroup.classList.remove('hidden');
        accToGroup.classList.add('hidden');
        transferWarn.classList.add('hidden');
        accToSelect.removeAttribute('required');
    } else if (type === 'expense') {
        titleObj.innerText = 'Tediye Fişi (Para Çıkışı)';
        lblAcc.innerText = 'Para Çıkacak Hesap (Kasa/Banka)';
        lblParty.innerText = 'Kime Ödendi? (Kişi / Kurum)';
        catGroup.classList.remove('hidden');
        partyGroup.classList.remove('hidden');
        accToGroup.classList.add('hidden');
        transferWarn.classList.add('hidden');
        accToSelect.removeAttribute('required');
    } else if (type === 'transfer') {
        titleObj.innerText = 'Virman Fişi (Hesaplar Arası)';
        lblAcc.innerText = 'Gönderici Hesap (Para Çıkacak)';
        catGroup.classList.add('hidden');
        partyGroup.classList.add('hidden'); // No party needed for virman
        accToGroup.classList.remove('hidden');
        transferWarn.classList.remove('hidden');
        accToSelect.setAttribute('required', 'true');
    }
    
    // Populate Categories (except transfer)
    catSelect.innerHTML = '';
    if (CATEGORIES[type]) {
        CATEGORIES[type].forEach(cat => {
            catSelect.innerHTML += `<option value="${cat.id}">${cat.label}</option>`;
        });
    }

    // Populate Accounts
    accSelect.innerHTML = '';
    STATE.accounts.forEach(acc => {
        accSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${formatMoney(acc.balance)})</option>`;
    });
    
    // Populate TO Accounts for Transfer
    accToSelect.innerHTML = '';
    STATE.accounts.forEach(acc => {
        accToSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${formatMoney(acc.balance)})</option>`;
    });
}

// Handle Transaction Form
document.getElementById('form-transaction').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('tx-type').value;
    const date = document.getElementById('tx-date').value;
    const accountId = document.getElementById('tx-account').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const desc = document.getElementById('tx-desc').value;
    const receiptData = document.getElementById('tx-receipt-data').value; // Base64 or empty string
    
    let category = null;
    let accountToId = null;

    if (type === 'transfer') {
        category = 'v_virman';
        accountToId = document.getElementById('tx-account-to').value;
        if (accountId === accountToId) {
            alert("Gönderici ve Alıcı hesap aynı olamaz.");
            return;
        }
    } else {
        category = document.getElementById('tx-category').value;
    }

    // Apply to account balance(s)
    const account = STATE.accounts.find(a => a.id === accountId);
    if (!account) return;

    if (type === 'income') {
        account.balance += amount;
    } else if (type === 'expense') {
        account.balance -= amount;
    } else if (type === 'transfer') {
        const accountTo = STATE.accounts.find(a => a.id === accountToId);
        if (!accountTo) return;
        
        account.balance -= amount; // Sending Account
        accountTo.balance += amount; // Receiving Account
    }

    STATE.transactions.push({
        id: generateId(),
        type,
        date,
        category,
        party: document.getElementById('tx-party').value.trim() || null,
        accountId,
        accountToId, // Only has value if type === transfer
        amount,
        desc,
        receipt: receiptData
    });

    saveState();
    closeModal('transaction-modal');
    updateUI();
});

function getCategoryLabel(type, catId) {
    const list = CATEGORIES[type] || CATEGORIES.transfer;
    const cat = list.find(c => c.id === catId);
    return cat ? cat.label : catId;
}

function getAccountName(id) {
    const acc = STATE.accounts.find(a => a.id === id);
    return acc ? acc.name : 'Silinmiş Hesap';
}

// --- Specific Rendering Logic ---
function updateUI() {
    renderDashboard();
    renderAccounts();
    renderTransactions();
}

function renderDashboard() {
    const totalBalance = STATE.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    // Current month start
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const monthlyTxs = STATE.transactions.filter(t => t.date >= startOfMonth);
    
    // Sadece income(Tahsilat) ve expense(Tediye). Transfer(Virman) toplam varlığı/geliri etkilemez.
    const monthlyIncome = monthlyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = monthlyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('dash-total-balance').innerText = formatMoney(totalBalance);
    document.getElementById('dash-monthly-income').innerText = formatMoney(monthlyIncome);
    document.getElementById('dash-monthly-expense').innerText = formatMoney(monthlyExpense);
}

function renderAccounts() {
    const list = document.getElementById('accounts-list');
    list.innerHTML = '';

    if (STATE.accounts.length === 0) {
        list.parentElement.innerHTML += `<div class="empty-state" id="acc-empty">Henüz açılmış bir hesabınız yok.</div>`;
        return;
    } else {
        const emptyState = document.getElementById('acc-empty');
        if(emptyState) emptyState.remove();
    }

    // Sort: Parent accounts first, then their children
    const parentAccounts = STATE.accounts.filter(a => !a.parentId);
    let sortedAccounts = [];
    
    parentAccounts.forEach(parent => {
        sortedAccounts.push(parent);
        const children = STATE.accounts.filter(a => a.parentId === parent.id);
        sortedAccounts = sortedAccounts.concat(children);
    });

    // Sub-accounts whose parent was deleted (failsafe)
    const orphans = STATE.accounts.filter(a => a.parentId && !STATE.accounts.find(p => p.id === a.parentId));
    sortedAccounts = sortedAccounts.concat(orphans);

    sortedAccounts.forEach(acc => {
        let typeLabel = "Banka";
        if(acc.type === 'cash') typeLabel = "Kasa/Nakit";
        if(acc.type === 'credit') typeLabel = "Kredi Kartı";

        const balClass = acc.balance < 0 ? 'negative-balance' : 'positive-balance';
        const isSub = acc.parentId ? 'is-sub-credit' : '';
        const ibanHtml = acc.iban ? `<div class="acc-iban">${acc.iban}</div>` : '';
        
        let dueDateHtml = '';
        if (acc.dueDate) {
            const dateStr = acc.dueDate.split('-').reverse().join('.');
            dueDateHtml = `<div class="due-date-badge"><i class="fa-regular fa-calendar" style="margin-right:5px"></i> Son Ödeme: ${dateStr}</div>`;
        }

        list.innerHTML += `
            <div class="account-card ${isSub}">
                <div class="type-badge">${typeLabel}</div>
                <h3>${acc.name}</h3>
                ${ibanHtml}
                ${dueDateHtml}
                <div class="acc-balance ${balClass}">${formatMoney(acc.balance)}</div>
            </div>
        `;
    });
}

function renderTransactions() {
    const list = document.getElementById('transactions-list');
    list.innerHTML = '';

    // Sort by date descending
    const sortedTxs = [...STATE.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Clear empty state if exists
    const containerEmpty = list.parentElement.parentElement;
    const oldEmpty = containerEmpty.querySelector('.empty-state');
    if(oldEmpty) oldEmpty.remove();

    if (sortedTxs.length === 0) {
        list.innerHTML = `<tr><td colspan="6" class="empty-state">Henüz muhasebe fişi bulunmuyor.</td></tr>`;
        return;
    }

    sortedTxs.forEach(tx => {
        let typeIcon = '';
        let sign = '';
        let amountClass = '';
        let accDesc = '';

        if (tx.type === 'income') {
            typeIcon = '<i class="fa-solid fa-arrow-turn-up text-success"></i>';
            sign = '+';
            amountClass = 'income';
            accDesc = getAccountName(tx.accountId);
        } else if (tx.type === 'expense') {
            typeIcon = '<i class="fa-solid fa-arrow-turn-down text-danger"></i>';
            sign = '-';
            amountClass = 'expense';
            accDesc = getAccountName(tx.accountId);
        } else if (tx.type === 'transfer') {
            typeIcon = '<i class="fa-solid fa-right-left text-warning"></i>';
            sign = '';
            amountClass = 'transfer';
            accDesc = `${getAccountName(tx.accountId)} <i class="fa-solid fa-arrow-right text-muted mx-1"></i> ${getAccountName(tx.accountToId)}`;
        }

        const receiptHtml = tx.receipt ? `<i class="fa-solid fa-file-invoice receipt-icon" onclick="showFullImage('${tx.receipt}')" title="Belgeyi Gör"></i>` : '-';
        const partyDisplay = tx.party ? tx.party : '-';

        list.innerHTML += `
            <tr>
                <td style="text-align:center;">${receiptHtml}</td>
                <td>${tx.date}</td>
                <td>${typeIcon} ${getCategoryLabel(tx.type, tx.category)}</td>
                <td><strong>${partyDisplay}</strong></td>
                <td>${accDesc}</td>
                <td>${tx.desc || '-'}</td>
                <td class="align-right tx-amount ${amountClass}">${sign}${formatMoney(tx.amount)}</td>
            </tr>
        `;
    });
}

function initReports() {
    const startObj = document.getElementById('report-start-date');
    const endObj = document.getElementById('report-end-date');
    
    if(!startObj.value && !endObj.value) {
        // Default to current month
        const now = new Date();
        startObj.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endObj.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    
    generateReport();
}

function generateReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    const filtered = STATE.transactions.filter(t => {
        return (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
    });

    const incomeAgg = {};
    const expenseAgg = {};

    CATEGORIES.income.forEach(c => incomeAgg[c.id] = { label: c.label, total: 0 });
    CATEGORIES.expense.forEach(c => expenseAgg[c.id] = { label: c.label, total: 0 });

    filtered.forEach(tx => {
        // Virman isn't included in PnL breaks
        if(tx.type === 'income' && incomeAgg[tx.category]) {
            incomeAgg[tx.category].total += tx.amount;
        } else if (tx.type === 'expense' && expenseAgg[tx.category]) {
            expenseAgg[tx.category].total += tx.amount;
        }
    });

    renderBreakdown('report-income-breakdown', incomeAgg, 'success-color');
    renderBreakdown('report-expense-breakdown', expenseAgg, 'danger-color');
}

function renderBreakdown(elementId, aggregation, colorVar) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';

    const items = Object.values(aggregation).filter(i => i.total > 0).sort((a,b) => b.total - a.total);

    if (items.length === 0) {
        list.innerHTML = '<li style="color: var(--text-muted)">Bu dönemde tahsilat/tediye yok.</li>';
        return;
    }

    items.forEach(item => {
        list.innerHTML += `
            <li>
                <span>${item.label}</span>
                <span style="color: var(--${colorVar}); font-weight: 600;">${formatMoney(item.total)}</span>
            </li>
        `;
    });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});
