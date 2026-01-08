const express = require('express');
const { spawn, exec } = require('child_process');

const app = express();
const PORT = 3000;

// === AUTHENTICATION ===
const AUTH_TOKEN = 'your_specific_authorization_string';

// Middleware to check Authorization header
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || authHeader !== AUTH_TOKEN) {
        return res.status(403).send(); // Forbidden
    }

    next();
});

// === URL SETUP ===
const URLS = {
    weather: ['https://www.meteoswiss.admin.ch/local-forecasts/zurich/8001.html#forecast-tab=detail-view', 'https://www.meteoswiss.admin.ch'],
    traffic: ['https://www.google.com/maps/@47.3870083,8.5131414,13z/data=!5m1!1e1?entry=ttu&g_ep=EgoyMDI1MDkwMy4wIKXMDSoASAFQAw%3D%3D', 'https://www.google.com/maps/@46.8768718,8.1526068,8z/data=!5m1!1e1?entry=ttu&g_ep=EgoyMDI1MDkwMy4wIKXMDSoASAFQAw%3D%3D'],
    train: ['https://maps.trafimage.ch/ch.sbb.netzkarte?display_srs=EPSG%3A2056&lang=en&layers=ch.sbb.puenktlichkeit-gondola,ch.sbb.puenktlichkeit-funicular,ch.sbb.puenktlichkeit-ferry,ch.sbb.puenktlichkeit-bus,ch.sbb.puenktlichkeit-tram,ch.sbb.puenktlichkeit-nv,ch.sbb.puenktlichkeit-fv,ch.sbb.geschosse2D&x=897771.46&y=5936414&z=8.11&baselayers=ch.sbb.netzkarte,ch.sbb.netzkarte.dark,ch.sbb.netzkarte.luftbild.group,ch.sbb.netzkarte.landeskarte,ch.sbb.netzkarte.landeskarte.grau', 'https://maps.trafimage.ch/ch.sbb.netzkarte?display_srs=EPSG%3A2056&lang=en&layers=ch.sbb.bahnhoffrequenzen,ch.sbb.geschosse2D&x=897771.46&y=5936414&z=8.11&baselayers=ch.sbb.netzkarte,ch.sbb.netzkarte.dark,ch.sbb.netzkarte.luftbild.group,ch.sbb.netzkarte.landeskarte,ch.sbb.netzkarte.landeskarte.grau'],
    internet: ['https://threatmap.checkpoint.com/', 'https://livethreatmap.radware.com/']
};

let currentProcesses = [];

// === SCREEN CONFIGURATION ===
const SCREEN_CONFIGS = [
    { x: 0, y: 600, width: 1300, height: 700 }, // bottom screen (DP-1)
    { x: 640, y: 0, width: 1000, height: 550 },  // top screen (DMI-1)
];

// === PROCESS MANAGEMENT ===
const { promisify } = require('util');
const execAsync = promisify(exec);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function killOldBrowsers() {
    // Attempt graceful shutdown of tracked processes
    for (const proc of currentProcesses) {
        try {
            process.kill(proc.pid, 'SIGTERM'); // Ask nicely first
        } catch (e) {
            console.error('Failed to send SIGTERM to process', proc.pid);
        }
    }

    await sleep(1000); // Give them a chance to exit

    // Force kill if still running
    for (const proc of currentProcesses) {
        try {
            process.kill(proc.pid, 'SIGKILL');
        } catch (e) {
            // Might already be gone, ignore
        }
    }

    currentProcesses = [];

    // Also kill any untracked Chromium fullscreen processes
    try {
        await execAsync("pkill -f 'chromium-browser.*--start-fullscreen'");
        console.log('Chromium processes killed');
    } catch (err) {
        console.error('Error killing Chromium processes:', err);
    }

    await sleep(500); // Wait a bit before launching new ones
}



async function launchOnScreens(urls) {
    await killOldBrowsers();

    urls.forEach((url, index) => {
        const screen = SCREEN_CONFIGS[index];

        // 👇 Unique profile per screen
        const profilePath = `/home/emmanuel/kiosk-profile-${index}`;
        const extensionPath = '/home/emmanuel/scroll-extension';
        
        const args = [
            //'--no-sandbox',
            '--start-fullscreen',
            `--window-size=${screen.width},${screen.height}`,
            `--window-position=${screen.x},${screen.y}`,
            '--disable-infobars',
            '--disable-session-crashed-bubble',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--disable-extensions-except=' + extensionPath,
            '--load-extension=' + extensionPath,
            `--user-data-dir=${profilePath}`,
            url
        ];

        const child = spawn('chromium-browser', args, {
            detached: true,
            stdio: 'ignore',
            env: {
                ...process.env,
                DISPLAY: ':0',
                XAUTHORITY: '/home/emmanuel/.Xauthority',
            }
        });

        child.unref();
        currentProcesses.push(child);
    });
}


// === ROUTES ===
app.get('/display_weather', async (req, res) => {
    try {
        await launchOnScreens(URLS.weather);
        res.send('Displaying weather');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to launch weather display');
    }
});

app.get('/display_traffic', async (req, res) => {
    try {
        await launchOnScreens(URLS.traffic);
        res.send('Displaying traffic');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to launch traffic display');
    }
});

app.get('/display_train', async (req, res) => {
    try {
        await launchOnScreens(URLS.train);
        res.send('Displaying train');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to launch train display');
    }
});

app.get('/display_internet', async (req, res) => {
    try {
        await launchOnScreens(URLS.internet);
        res.send('Displaying internet');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to launch internet display');
    }
});

app.get('/stop', async (req, res) => {
    try {
        await killOldBrowsers();
        res.send('All browser windows closed.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to stop browsers');
    }
});

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
