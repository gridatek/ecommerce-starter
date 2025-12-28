const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

// Check if running in CI
const isCI = process.env.CI === 'true';

const rootPath = path.join(__dirname, '..');
const backendPath = path.join(rootPath, 'backend');
const storefrontPath = path.join(rootPath, 'storefront');

// Helper function for colored output
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, total, message) {
    log(`\n[${ step}/${total}] ${message}`, 'bold');
    log('─'.repeat(60), 'cyan');
}

// Create readline interface
function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// Prompt user for input
function question(query) {
    if (isCI) {
        return Promise.resolve('');
    }

    const rl = createInterface();
    return new Promise(resolve => {
        rl.question(query, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

// Check if command exists
function commandExists(command) {
    try {
        execSync(`${command} --version`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Get version of a command
function getVersion(command) {
    try {
        return execSync(`${command} --version`, { encoding: 'utf-8' }).trim().split('\n')[0];
    } catch {
        return 'unknown';
    }
}

// Print welcome banner
function printBanner() {
    console.clear();
    log('\n' + '═'.repeat(70), 'cyan');
    log('                  🛍️  E-COMMERCE STARTER INSTALLATION', 'bold');
    log('                   Angular + Medusa.js Full Stack', 'cyan');
    log('═'.repeat(70) + '\n', 'cyan');
}

// Check all prerequisites
async function checkPrerequisites() {
    logStep(1, 5, '🔍 Checking Prerequisites');

    const checks = {
        node: commandExists('node'),
        npm: commandExists('npm'),
        postgres: commandExists('psql'),
        git: commandExists('git')
    };

    // Display results
    log('\nSystem Check:', 'yellow');

    if (checks.node) {
        log(`  ✅ Node.js: ${getVersion('node')}`, 'green');
    } else {
        log('  ❌ Node.js: Not installed', 'red');
    }

    if (checks.npm) {
        log(`  ✅ npm: ${getVersion('npm')}`, 'green');
    } else {
        log('  ❌ npm: Not installed', 'red');
    }

    if (checks.postgres) {
        log(`  ✅ PostgreSQL: ${getVersion('psql')}`, 'green');
    } else {
        log('  ⚠️  PostgreSQL: Not found in PATH', 'yellow');
    }

    if (checks.git) {
        log(`  ✅ Git: ${getVersion('git')}`, 'green');
    } else {
        log('  ⚠️  Git: Not installed', 'yellow');
    }

    // Check if required tools are present
    if (!checks.node || !checks.npm) {
        log('\n❌ Node.js and npm are required!', 'red');
        log('Please install Node.js 18+ from https://nodejs.org/', 'yellow');
        return false;
    }

    // Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
        log(`\n❌ Node.js version ${nodeVersion} is too old!`, 'red');
        log('Please upgrade to Node.js 18 or higher', 'yellow');
        return false;
    }

    if (!checks.postgres && !isCI) {
        log('\n⚠️  PostgreSQL not detected in PATH', 'yellow');
        const answer = await question('Do you have PostgreSQL installed and running? (y/n): ');
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            log('\nPlease install PostgreSQL before continuing:', 'yellow');
            log('  https://www.postgresql.org/download/', 'cyan');
            return false;
        }
    }

    log('\n✅ All prerequisites satisfied!', 'green');
    return true;
}

// Install root dependencies
async function installRootDependencies() {
    logStep(2, 5, '📦 Installing Root Dependencies');

    try {
        log('Installing workspace dependencies...', 'yellow');
        execSync('npm install', {
            cwd: rootPath,
            stdio: 'inherit'
        });
        log('\n✅ Root dependencies installed', 'green');
    } catch (error) {
        throw new Error(`Failed to install root dependencies: ${error.message}`);
    }
}

// Install storefront
async function installStorefront() {
    logStep(3, 5, '⚡ Installing Storefront (Angular)');

    if (!fs.existsSync(storefrontPath)) {
        log('❌ Storefront directory not found!', 'red');
        log('This should already exist in your repository.', 'yellow');
        throw new Error('Storefront directory missing');
    }

    try {
        log('Installing Angular dependencies...', 'yellow');
        execSync('npm install', {
            cwd: storefrontPath,
            stdio: 'inherit'
        });
        log('\n✅ Storefront dependencies installed', 'green');
    } catch (error) {
        throw new Error(`Failed to install storefront: ${error.message}`);
    }
}

// Install backend using the backend installer script
async function installBackend() {
    logStep(4, 5, '🚀 Installing Backend (Medusa)');

    try {
        // Run the backend installation script
        await new Promise((resolve, reject) => {
            const install = spawn('node', ['scripts/install-backend.js'], {
                stdio: 'inherit',
                cwd: rootPath,
                env: { ...process.env }
            });

            install.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Backend installation failed with code ${code}`));
                }
            });

            install.on('error', (err) => {
                reject(err);
            });
        });

        log('\n✅ Backend installed successfully', 'green');
    } catch (error) {
        throw new Error(`Failed to install backend: ${error.message}`);
    }
}

// Verify workspace setup
function verifyWorkspaces() {
    logStep(5, 5, '🔍 Verifying Workspace Setup');

    const checks = {
        backend: fs.existsSync(backendPath),
        storefrontNodeModules: fs.existsSync(path.join(storefrontPath, 'node_modules')),
        backendNodeModules: fs.existsSync(path.join(backendPath, 'node_modules')),
        backendEnv: fs.existsSync(path.join(backendPath, '.env'))
    };

    log('\nWorkspace Status:', 'yellow');
    log(`  Backend directory: ${checks.backend ? '✅' : '❌'}`, checks.backend ? 'green' : 'red');
    log(`  Storefront dependencies: ${checks.storefrontNodeModules ? '✅' : '❌'}`, checks.storefrontNodeModules ? 'green' : 'red');
    log(`  Backend dependencies: ${checks.backendNodeModules ? '✅' : '❌'}`, checks.backendNodeModules ? 'green' : 'red');
    log(`  Backend .env file: ${checks.backendEnv ? '✅' : '❌'}`, checks.backendEnv ? 'green' : 'red');

    const allGood = Object.values(checks).every(Boolean);

    if (allGood) {
        log('\n✅ Workspace setup verified!', 'green');
    } else {
        log('\n⚠️  Some components may not be properly installed', 'yellow');
    }

    return allGood;
}

// Print final instructions
function printFinalInstructions() {
    log('\n' + '═'.repeat(70), 'green');
    log('                     🎉 INSTALLATION COMPLETE!', 'bold');
    log('═'.repeat(70) + '\n', 'green');

    log('📋 Quick Start Guide:\n', 'cyan');

    log('1️⃣  Start both servers (recommended):', 'yellow');
    log('   npm run dev', 'white');

    log('\n2️⃣  Or start individually:', 'yellow');
    log('   Backend:     npm run dev:backend', 'white');
    log('   Storefront:  npm run dev:storefront', 'white');

    log('\n🌐 Your Applications:', 'cyan');
    log('   Storefront:    http://localhost:4200', 'white');
    log('   Backend API:   http://localhost:9000', 'white');
    log('   Admin Panel:   http://localhost:9000/app', 'white');

    log('\n🛠️  Useful Commands:', 'cyan');
    log('   npm run build              - Build both projects', 'white');
    log('   npm run lint               - Lint storefront code', 'white');
    log('   npm run test               - Run storefront tests', 'white');
    log('   npm run backend:seed       - Seed backend with sample data', 'white');
    log('   npm run backend:migrations - Run backend migrations', 'white');

    log('\n📚 Documentation:', 'cyan');
    log('   Angular:  https://angular.io/docs', 'white');
    log('   Medusa:   https://docs.medusajs.com', 'white');

    log('\n💡 Tips:', 'yellow');
    log('   • Review backend/.env for configuration options', 'white');
    log('   • Check storefront/src/environments/ for Angular config', 'white');
    log('   • Use npm workspaces for managing dependencies', 'white');

    log('\n' + '═'.repeat(70) + '\n', 'green');
}

// Print error and exit
function handleError(error) {
    log(`\n❌ Installation failed: ${error.message}`, 'red');
    log('\nPlease check the error above and try again.', 'yellow');

    if (!isCI) {
        log('\n💡 Common Solutions:', 'cyan');
        log('   • Ensure PostgreSQL is running', 'white');
        log('   • Check your network connection', 'white');
        log('   • Verify Node.js version (18+ required)', 'white');
        log('   • Try running: npm run clean && npm run install:all', 'white');
        log('\n📝 Need help? Check README.md or open an issue', 'cyan');
    }

    process.exit(1);
}

// Main installation flow
async function main() {
    try {
        // Print banner
        printBanner();

        // Step 1: Check prerequisites
        const prerequisitesOk = await checkPrerequisites();
        if (!prerequisitesOk) {
            process.exit(1);
        }

        // Wait for user confirmation in interactive mode
        if (!isCI) {
            log('\n');
            const proceed = await question('Press Enter to start installation or Ctrl+C to cancel...');
        }

        // Step 2: Install root dependencies
        await installRootDependencies();

        // Step 3: Install storefront
        await installStorefront();

        // Step 4: Install backend
        await installBackend();

        // Step 5: Verify setup
        verifyWorkspaces();

        // Print final instructions
        printFinalInstructions();

    } catch (error) {
        handleError(error);
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    handleError(error);
});

process.on('uncaughtException', (error) => {
    handleError(error);
});

// Run the master installer
main();