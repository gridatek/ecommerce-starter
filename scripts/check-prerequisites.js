const { execSync } = require('child_process');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCommand(command, name, minVersion = null) {
    try {
        const version = execSync(`${command} --version`, { encoding: 'utf-8' }).trim();
        log(`✅ ${name}: ${version}`, 'green');
        return true;
    } catch {
        log(`❌ ${name}: Not installed`, 'red');
        return false;
    }
}

function main() {
    log('\n🔍 Checking System Prerequisites\n', 'cyan');

    const checks = {
        node: checkCommand('node', 'Node.js'),
        npm: checkCommand('npm', 'npm'),
        postgres: checkCommand('psql', 'PostgreSQL'),
        git: checkCommand('git', 'Git')
    };

    log('\n📋 Summary:', 'cyan');

    const allPassed = Object.values(checks).every(Boolean);

    if (allPassed) {
        log('✅ All prerequisites are installed!', 'green');
        log('You can proceed with installation.\n', 'green');
    } else {
        log('⚠️  Some prerequisites are missing.', 'yellow');
        log('\nRequired installations:', 'yellow');
        if (!checks.node) log('  - Node.js 18+: https://nodejs.org/', 'white');
        if (!checks.npm) log('  - npm (comes with Node.js)', 'white');
        if (!checks.postgres) log('  - PostgreSQL: https://www.postgresql.org/download/', 'white');
        log('');
    }
}

main();