const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

// Check if running in CI
const isCI = process.env.CI === 'true';

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

const backendPath = path.join(__dirname, '..', 'backend');

// Helper function for colored output
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
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
        // In CI, don't prompt - return empty string to use defaults
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

// Generate secure random secret
function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Process template file with replacements
function processTemplate(templatePath, replacements) {
    let content = fs.readFileSync(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
    }

    return content;
}

// Check if backend directory exists
async function checkExistingBackend() {
    if (fs.existsSync(backendPath)) {
        if (isCI) {
            log('🗑️  Removing existing backend (CI mode)...', 'yellow');
            fs.rmSync(backendPath, { recursive: true, force: true });
            log('✅ Removed successfully', 'green');
            return true;
        }

        log('\n⚠️  Backend directory already exists!', 'yellow');
        const answer = await question('Do you want to remove it and reinstall? (y/n): ');

        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            log('🗑️  Removing existing backend...', 'yellow');
            fs.rmSync(backendPath, { recursive: true, force: true });
            log('✅ Removed successfully', 'green');
            return true;
        } else {
            log('Installation cancelled.', 'yellow');
            return false;
        }
    }
    return true;
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

// Check prerequisites
async function checkPrerequisites() {
    log('\n🔍 Checking prerequisites...', 'cyan');

    const checks = {
        node: commandExists('node'),
        npm: commandExists('npm'),
        postgres: commandExists('psql')
    };

    if (!checks.node) {
        log('❌ Node.js is not installed. Please install Node.js 18 or higher.', 'red');
        return false;
    }

    if (!checks.npm) {
        log('❌ npm is not installed. Please install npm.', 'red');
        return false;
    }

    log('✅ Node.js and npm are installed', 'green');

    if (!checks.postgres && !isCI) {
        log('⚠️  PostgreSQL client not found in PATH', 'yellow');
        const answer = await question('Do you have PostgreSQL installed and running? (y/n): ');
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            log('Please install PostgreSQL before continuing.', 'yellow');
            log('Visit: https://www.postgresql.org/download/', 'cyan');
            return false;
        }
    } else if (checks.postgres) {
        log('✅ PostgreSQL detected', 'green');
    }

    return true;
}

// Get database configuration
async function getDatabaseConfig() {
    // In CI, use environment variables
    if (isCI) {
        return {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5432',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            name: process.env.DB_NAME || 'medusa_test'
        };
    }

    log('\n📊 Database Configuration', 'cyan');
    log('Press Enter to use default values shown in [brackets]\n', 'yellow');

    const dbHost = (await question('Database host [localhost]: ')) || 'localhost';
    const dbPort = (await question('Database port [5432]: ')) || '5432';
    const dbUser = (await question('Database user [postgres]: ')) || 'postgres';
    const dbPassword = await question('Database password: ');
    const dbName = (await question('Database name [medusa-store]: ')) || 'medusa-store';

    return {
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        name: dbName
    };
}

// Install Medusa backend
async function installMedusa() {
    log('\n🚀 Installing Medusa backend...', 'cyan');
    log('This may take a few minutes...\n', 'yellow');

    try {
        return new Promise((resolve, reject) => {
            const args = [
                'create-medusa-app@latest',
                '--skip-db',
                'backend'
            ];

            const install = spawn('npx', args, {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..')
            });

            install.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Installation failed with code ${code}`));
                }
            });

            install.on('error', (err) => {
                reject(err);
            });
        });
    } catch (error) {
        throw new Error(`Failed to install Medusa: ${error.message}`);
    }
}

// Create .env file from template
function createEnvFile(dbConfig) {
    log('\n📝 Creating .env file from template...', 'cyan');

    const templatePath = path.join(__dirname, 'templates', '.env.template');

    // Check if template exists
    if (!fs.existsSync(templatePath)) {
        log('⚠️  Template file not found. Creating basic .env file...', 'yellow');
        createBasicEnvFile(dbConfig);
        return;
    }

    const replacements = {
        DB_USER: dbConfig.user,
        DB_PASSWORD: dbConfig.password,
        DB_HOST: dbConfig.host,
        DB_PORT: dbConfig.port,
        DB_NAME: dbConfig.name,
        JWT_SECRET: isCI ? 'test-jwt-secret' : generateSecret(32),
        COOKIE_SECRET: isCI ? 'test-cookie-secret' : generateSecret(32)
    };

    const envContent = processTemplate(templatePath, replacements);
    const envPath = path.join(backendPath, '.env');

    fs.writeFileSync(envPath, envContent);

    log('✅ .env file created from template', 'green');

    if (!isCI) {
        log('\n💡 Tip: Review backend/.env and uncomment any plugins you want to use', 'cyan');
    }
}

// Create basic .env file if template doesn't exist
function createBasicEnvFile(dbConfig) {
    const dbUrl = `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`;

    const envContent = `# Database
DATABASE_URL=${dbUrl}

# Redis (optional, but recommended for production)
REDIS_URL=redis://localhost:6379

# JWT Secret (change in production!)
JWT_SECRET=${isCI ? 'test-jwt-secret' : generateSecret(32)}

# Cookie Secret (change in production!)
COOKIE_SECRET=${isCI ? 'test-cookie-secret' : generateSecret(32)}

# Medusa Backend URL
MEDUSA_BACKEND_URL=http://localhost:9000

# Store CORS (add your storefront URL)
STORE_CORS=http://localhost:4200,http://localhost:3000

# Admin CORS
ADMIN_CORS=http://localhost:7001,http://localhost:7000,http://localhost:9000

# Admin URL
MEDUSA_ADMIN_BACKEND_URL=http://localhost:9000

# Node Environment
NODE_ENV=development
`;

    const envPath = path.join(backendPath, '.env');
    fs.writeFileSync(envPath, envContent);

    log('✅ Basic .env file created', 'green');
}

// Run database migrations
async function runMigrations() {
    log('\n🔄 Running database migrations...', 'cyan');

    try {
        log('Building backend...', 'yellow');
        execSync('npm run build', {
            cwd: backendPath,
            stdio: 'inherit'
        });

        log('Running migrations...', 'yellow');
        execSync('npx medusa migrations run', {
            cwd: backendPath,
            stdio: 'inherit'
        });

        log('✅ Migrations completed successfully', 'green');
    } catch (error) {
        throw new Error(`Migration failed: ${error.message}`);
    }
}

// Create admin user
async function createAdminUser() {
    if (isCI || process.env.SKIP_USER_PROMPT === 'true') {
        log('\n⏭️  Skipping admin user creation (CI mode)', 'yellow');
        return;
    }

    log('\n👤 Create Admin User', 'cyan');

    const createUser = await question('Would you like to create an admin user now? (y/n): ');

    if (createUser.toLowerCase() === 'y' || createUser.toLowerCase() === 'yes') {
        const email = await question('Admin email: ');
        const password = await question('Admin password: ');

        if (!email || !password) {
            log('⚠️  Email and password are required. Skipping user creation.', 'yellow');
            return;
        }

        try {
            execSync(`npx medusa user -e ${email} -p ${password}`, {
                cwd: backendPath,
                stdio: 'inherit'
            });
            log('✅ Admin user created successfully', 'green');
        } catch (error) {
            log('⚠️  Failed to create admin user. You can create one later using:', 'yellow');
            log(`   cd backend && npx medusa user -e ${email} -p ${password}`, 'cyan');
        }
    }
}

// Seed database with sample data
async function seedDatabase() {
    if (isCI && process.env.SKIP_SEED_PROMPT === 'true') {
        log('\n⏭️  Skipping database seeding (CI mode)', 'yellow');
        return;
    }

    if (isCI) {
        log('\n🌱 Seeding database...', 'cyan');
        try {
            execSync('npm run seed', {
                cwd: backendPath,
                stdio: 'inherit'
            });
            log('✅ Database seeded successfully', 'green');
        } catch (error) {
            log('⚠️  Failed to seed database', 'yellow');
        }
        return;
    }

    log('\n🌱 Seed Database', 'cyan');
    const shouldSeed = await question('Would you like to seed the database with sample data? (y/n): ');

    if (shouldSeed.toLowerCase() === 'y' || shouldSeed.toLowerCase() === 'yes') {
        try {
            log('Seeding database...', 'yellow');
            execSync('npm run seed', {
                cwd: backendPath,
                stdio: 'inherit'
            });
            log('✅ Database seeded successfully', 'green');
        } catch (error) {
            log('⚠️  Failed to seed database', 'yellow');
            log('You can seed it later using: cd backend && npm run seed', 'cyan');
        }
    }
}

// Copy additional files
function copyAdditionalFiles() {
    if (isCI) {
        return; // Skip in CI
    }

    log('\n📄 Copying additional files...', 'cyan');

    // Copy README if template exists
    const readmeTemplatePath = path.join(__dirname, 'templates', 'README.backend.md');
    if (fs.existsSync(readmeTemplatePath)) {
        const readmeTargetPath = path.join(backendPath, 'README.md');
        fs.copyFileSync(readmeTemplatePath, readmeTargetPath);
        log('✅ Backend README copied', 'green');
    }
}

// Print next steps
function printNextSteps() {
    if (isCI) {
        log('\n✅ Backend installed successfully (CI mode)', 'green');
        return;
    }

    log('\n' + '='.repeat(60), 'green');
    log('🎉 Medusa backend installed successfully!', 'green');
    log('='.repeat(60), 'green');

    log('\n📋 Next Steps:\n', 'cyan');
    log('1. Start the backend:', 'yellow');
    log('   cd backend && npm run dev', 'white');
    log('\n2. Access Medusa Admin at:', 'yellow');
    log('   http://localhost:9000/app', 'white');
    log('\n3. Backend API available at:', 'yellow');
    log('   http://localhost:9000', 'white');
    log('\n4. Start your storefront:', 'yellow');
    log('   cd storefront && npm start', 'white');
    log('\n💡 Tip: Use "npm run dev" from the root to start both servers', 'cyan');
    log('\n📚 Documentation:', 'yellow');
    log('   https://docs.medusajs.com', 'white');
    log('');
}

// Print error and exit
function handleError(error) {
    log(`\n❌ Installation failed: ${error.message}`, 'red');
    log('\nPlease check the error above and try again.', 'yellow');

    if (!isCI) {
        log('\n💡 Common issues:', 'cyan');
        log('   - Ensure PostgreSQL is running', 'white');
        log('   - Check database credentials', 'white');
        log('   - Verify Node.js version (18+ required)', 'white');
        log('   - Check network connection', 'white');
        log('\n📝 For help, visit: https://docs.medusajs.com/troubleshooting', 'cyan');
    }

    process.exit(1);
}

// Main installation flow
async function main() {
    try {
        if (!isCI) {
            log('\n' + '='.repeat(60), 'blue');
            log('🛍️  Medusa Backend Installation', 'blue');
            log('='.repeat(60) + '\n', 'blue');
        } else {
            log('\n🤖 Running in CI mode', 'cyan');
        }

        // Step 1: Check prerequisites
        const prerequisitesOk = await checkPrerequisites();
        if (!prerequisitesOk) {
            process.exit(1);
        }

        // Step 2: Check existing backend
        const shouldContinue = await checkExistingBackend();
        if (!shouldContinue) {
            process.exit(0);
        }

        // Step 3: Get database configuration
        const dbConfig = await getDatabaseConfig();

        // Step 4: Install Medusa
        await installMedusa();

        // Step 5: Create .env file
        createEnvFile(dbConfig);

        // Step 6: Run migrations
        await runMigrations();

        // Step 7: Create admin user
        await createAdminUser();

        // Step 8: Seed database
        await seedDatabase();

        // Step 9: Copy additional files
        copyAdditionalFiles();

        // Step 10: Print next steps
        printNextSteps();

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

// Run the installer
main();