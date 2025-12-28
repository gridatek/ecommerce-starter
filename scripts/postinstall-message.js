const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

const backendExists = fs.existsSync(path.join(__dirname, '..', 'backend'));

log('\n' + '═'.repeat(60), 'cyan');
log('  ✅ Dependencies installed successfully!', 'green');
log('═'.repeat(60) + '\n', 'cyan');

if (!backendExists) {
    log('📋 Next Steps:', 'bold');
    log('');
    log('  1. Ensure PostgreSQL is installed and running', 'yellow');
    log('  2. Run the full installation:', 'cyan');
    log('     npm run install:all', 'white');
    log('');
    log('  Or install components separately:', 'cyan');
    log('     npm run install:backend    # Install Medusa backend', 'white');
    log('     npm run install:storefront # Install Angular storefront', 'white');
} else {
    log('🎉 Everything is installed!', 'green');
    log('');
    log('  Start development with:', 'cyan');
    log('     npm run dev', 'white');
    log('');
    log('  Or start individually:', 'cyan');
    log('     npm run dev:backend     # Start Medusa (port 9000)', 'white');
    log('     npm run dev:storefront  # Start Angular (port 4200)', 'white');
}

log('\n' + '═'.repeat(60) + '\n', 'cyan');