// Data persistence and authentication handling
const STORAGE_KEY = 'elearning_safety_riding';

// Department list
const DEPARTMENTS = [
    'TPM/FOC', 'Body Assy', 'Painting Steel', 'Painting Plastik', 
    'Plastik Injection', 'Press Welding Frame', 'Press Welding Fuel Tank',
    'Dies Casting', 'Machining', 'Engine Assy', 'Quality Enginering',
    'Packing', 'PC Indirect', 'Material Kontrol', 'QA Gabungan',
    'Purchase Gabungan', 'HR Gabungan', 'Marketing Gabungan', 'Lain Lain'
];

// Initialize storage if not exists
if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        users: {},
        analytics: {
            departmentAccess: {},
            averageScores: {},
            moduleCompletion: {}
        }
    }));
}

// User authentication and session management
class Auth {
    static isLoggedIn() {
        return sessionStorage.getItem('currentUser') !== null;
    }

    static getCurrentUser() {
        return JSON.parse(sessionStorage.getItem('currentUser'));
    }

    static login(npk, nama, bagian) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        
        // Create new user if not exists
        if (!data.users[npk]) {
            data.users[npk] = {
                npk,
                nama,
                bagian,
                progress: {
                    basic: { completed: false, score: 0 },
                    braking: { completed: false, score: 0 },
                    hazard: { completed: false, score: 0 },
                    microsleep: { completed: false, score: 0 },
                    blindspot: { completed: false, score: 0 }
                },
                commitment: '',
                completionDate: null
            };
        }

        // Update analytics
        if (!data.analytics.departmentAccess[bagian]) {
            data.analytics.departmentAccess[bagian] = 0;
        }
        data.analytics.departmentAccess[bagian]++;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        sessionStorage.setItem('currentUser', JSON.stringify(data.users[npk]));
        
        return true;
    }

    static logout() {
        sessionStorage.removeItem('currentUser');
    }

    static updateProgress(module, score) {
        const currentUser = this.getCurrentUser();
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        
        data.users[currentUser.npk].progress[module] = {
            completed: true,
            score: score
        };
        
        // Update user session
        sessionStorage.setItem('currentUser', JSON.stringify(data.users[currentUser.npk]));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        // Update analytics
        this.updateAnalytics();
    }

    static updateAnalytics() {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const analytics = data.analytics;
        
        // Calculate average scores per department
        const departmentScores = {};
        Object.values(data.users).forEach(user => {
            if (!departmentScores[user.bagian]) {
                departmentScores[user.bagian] = [];
            }
            
            const scores = Object.values(user.progress).map(p => p.score);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            departmentScores[user.bagian].push(avgScore);
        });

        // Update average scores
        Object.keys(departmentScores).forEach(dept => {
            const scores = departmentScores[dept];
            analytics.averageScores[dept] = scores.reduce((a, b) => a + b, 0) / scores.length;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    static saveCommitment(commitment) {
        const currentUser = this.getCurrentUser();
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        
        data.users[currentUser.npk].commitment = commitment;
        data.users[currentUser.npk].completionDate = new Date().toISOString();
        
        sessionStorage.setItem('currentUser', JSON.stringify(data.users[currentUser.npk]));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    static exportToExcel() {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        let csv = 'NPK,Nama,Bagian,Basic Score,Braking Score,Hazard Score,Microsleep Score,Blindspot Score,Commitment,Completion Date\n';
        
        Object.values(data.users).forEach(user => {
            csv += `${user.npk},${user.nama},${user.bagian},`;
            csv += `${user.progress.basic.score},${user.progress.braking.score},`;
            csv += `${user.progress.hazard.score},${user.progress.microsleep.score},`;
            csv += `${user.progress.blindspot.score},"${user.commitment}",${user.completionDate}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'safety_riding_data.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
