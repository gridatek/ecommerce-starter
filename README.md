# E-commerce Starter

Full-stack e-commerce application built with Angular and Medusa.js.

## Features

- 🛍️ **Storefront**: Modern Angular frontend
- 🚀 **Backend**: Medusa.js headless commerce engine
- 📦 **Monorepo**: npm workspaces for easy management
- 🔄 **Live Reload**: Hot module replacement for both apps
- 🎨 **TypeScript**: Full type safety across the stack

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm 9+

## Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd ecommerce-starter
```

### 2. Install everything
```bash
npm run install:all
```

This will:
- ✅ Check system prerequisites
- ✅ Install root dependencies
- ✅ Install storefront (Angular) dependencies
- ✅ Install and configure backend (Medusa)
- ✅ Setup database and run migrations

### 3. Start development
```bash
npm run dev
```

This starts both:
- Storefront at http://localhost:4200
- Backend at http://localhost:9000
- Admin at http://localhost:9000/app

## Available Scripts

### Development
```bash
npm run dev                 # Start both servers
npm run dev:backend         # Start backend only
npm run dev:storefront      # Start storefront only
```

### Building
```bash
npm run build               # Build both projects
npm run build:backend       # Build backend only
npm run build:storefront    # Build storefront only
```

### Testing & Linting
```bash
npm run test                # Run storefront tests
npm run lint                # Lint storefront code
```

### Backend Management
```bash
npm run backend:seed        # Seed database with sample data
npm run backend:migrations  # Run database migrations
npm run backend:user        # Create admin user
```

### Cleanup
```bash
npm run clean               # Remove all dependencies and builds
npm run clean:backend       # Remove backend only
npm run clean:storefront    # Remove storefront dependencies
```

## Project Structure
```
ecommerce-starter/
├── backend/              # Medusa backend (auto-generated)
├── storefront/           # Angular storefront
│   ├── src/
│   ├── angular.json
│   └── package.json
├── scripts/              # Installation scripts
│   ├── install.js        # Master installer
│   ├── install-backend.js
│   └── templates/
├── package.json          # Workspace root
└── README.md
```

## Configuration

### Backend (.env)

Configuration is in `backend/.env`:
```env
DATABASE_URL=postgres://user:password@localhost:5432/medusa
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
COOKIE_SECRET=your-secret
STORE_CORS=http://localhost:4200
```

### Storefront

Angular environment files in `storefront/src/environments/`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:9000'
};
```

## Workspace Commands

Since this is an npm workspace, you can run commands in specific packages:
```bash
# Run command in storefront
npm run <script> --workspace=storefront

# Run command in backend
npm run <script> --workspace=backend

# Install package in storefront
npm install <package> --workspace=storefront
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 9000 (backend)
npx kill-port 9000

# Kill process on port 4200 (storefront)
npx kill-port 4200
```

### Database connection issues

1. Ensure PostgreSQL is running
2. Check `backend/.env` database URL
3. Verify database exists: `psql -l`

### Reinstall everything
```bash
npm run clean
npm run install:all
```

## Documentation

- [Angular Documentation](https://angular.io/docs)
- [Medusa Documentation](https://docs.medusajs.com)

## License

MIT