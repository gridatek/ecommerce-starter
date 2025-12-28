const { execSync } = require('child_process');
const os = require('os');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCommand(command, name, minVersion = null) {
    try {
        const version = execSync(`${command} --version`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        log(`✅ ${name}: ${version.split('\n')[0]}`, 'green');
        return true;
    } catch {
        log(`❌ ${name}: Not installed`, 'red');
        return false;
    }
}

function checkPostgres() {
    // Try multiple ways to detect PostgreSQL on different platforms
    const isWindows = os.platform() === 'win32';

    try {
        if (isWindows) {
            // Check if PostgreSQL service is running on Windows
            try {
                const services = execSync('sc query postgresql* 2>nul', {
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                if (services.includes('RUNNING') || services.includes('postgresql')) {
                    log('✅ PostgreSQL: Service detected (Windows)', 'green');
                    return true;
                }
            } catch {
                // Service not found via sc query
            }

            // Try checking common PostgreSQL installation paths
            const commonPaths = [
                'C:\\Program Files\\PostgreSQL',
                'C:\\PostgreSQL'
            ];

            const fs = require('fs');
            for (const pgPath of commonPaths) {
                if (fs.existsSync(pgPath)) {
                    log(`✅ PostgreSQL: Installation found at ${pgPath}`, 'green');
                    log('   Note: psql not in PATH, but PostgreSQL appears to be installed', 'yellow');
                    return true;
                }
            }
        }

        // Try psql command
        const version = execSync('psql --version', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        log(`✅ PostgreSQL: ${version}`, 'green');
        return true;
    } catch {
        log('⚠️  PostgreSQL: Not detected', 'yellow');
        return false;
    }
}

function main() {
    log('\n🔍 Checking System Prerequisites\n', 'cyan');

    const checks = {
        node: checkCommand('node', 'Node.js'),
        npm: checkCommand('npm', 'npm'),
        postgres: checkPostgres(),
        git: checkCommand('git', 'Git')
    };

    log('\n📋 Summary:', 'cyan');

    const criticalChecks = checks.node && checks.npm;
    const optionalChecks = checks.postgres && checks.git;

    if (criticalChecks && optionalChecks) {
        log('✅ All prerequisites are installed!', 'green');
        log('You can proceed with installation.\n', 'green');
        process.exit(0);
    } else if (criticalChecks) {
        log('✅ Required prerequisites are installed!', 'green');

        if (!checks.postgres) {
            log('\n⚠️  PostgreSQL not detected:', 'yellow');
            log('   PostgreSQL is required to run the backend.', 'white');
            log('   Download: https://www.postgresql.org/download/', 'cyan');
            log('   If already installed, ensure it\'s running and accessible.', 'white');
        }

        if (!checks.git) {
            log('\n⚠️  Git not detected (optional):', 'yellow');
            log('   Git is recommended but not required.', 'white');
            log('   Download: https://git-scm.com/downloads', 'cyan');
        }

        log('\n💡 You can still proceed with storefront installation.', 'cyan');
        log('   Backend installation will require PostgreSQL.\n', 'cyan');
        process.exit(0);
    } else {
        log('❌ Required prerequisites are missing!\n', 'red');

        if (!checks.node) {
            log('  • Node.js 18+: https://nodejs.org/', 'white');
        }
        if (!checks.npm) {
            log('  • npm (comes with Node.js)', 'white');
        }

        log('');
        process.exit(1);
    }
}

main();