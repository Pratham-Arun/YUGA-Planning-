require('dotenv').config();

module.exports = {
    // Server Configuration
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // MongoDB
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/yuga',

    // JWT
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

    // OAuth
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI
    },

    // Storage
    storage: {
        // Supabase
        supabase: {
            url: process.env.SUPABASE_URL,
            serviceKey: process.env.SUPABASE_SERVICE_KEY,
            anonKey: process.env.SUPABASE_ANON_KEY
        },
        // AWS S3
        s3: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
            bucketName: process.env.AWS_BUCKET_NAME
        }
    },

    // AI Services
    ai: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            orgId: process.env.OPENAI_ORG_ID
        },
        replicate: {
            apiToken: process.env.REPLICATE_API_TOKEN
        }
    },

    // Vector Database
    vectorDb: {
        pinecone: {
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT
        }
    },

    // Client
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

    // Compilation
    docker: {
        unityImage: process.env.UNITY_DOCKER_IMAGE || 'unity-builder:latest',
        rustImage: process.env.RUST_DOCKER_IMAGE || 'rust-builder:latest'
    },

    // Cors
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    }
};