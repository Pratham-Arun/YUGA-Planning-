YUGA backend (minimal scaffold)

This is a minimal Express + TypeScript backend scaffold for authentication and simple project management using SQLite for local development.

Quick start (Windows PowerShell):

```powershell
cd backend
npm install
cp .env.example .env
# edit .env to set JWT_SECRET
npm run dev
```

Available endpoints (basic):
- POST /api/auth/register {email,password,displayName}
- POST /api/auth/login {email,password}
- POST /api/auth/refresh {refreshToken}
- POST /api/auth/logout {refreshToken}

- GET /api/projects (requires Bearer token)
- POST /api/projects {name,metadata}
- GET /api/projects/:id
- PATCH /api/projects/:id
- DELETE /api/projects/:id

This is a minimal starting point to iterate on. Next steps:
- Add proper tests and validations
- Use argon2 for password hashing
- Hash refresh tokens in DB instead of storing raw tokens
- Add migrations and environment-specific configs
- Add rate-limiting, email verification, password reset flows
