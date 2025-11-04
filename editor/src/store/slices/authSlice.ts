import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthService } from '@services/auth';

interface AuthState {
    user: {
        id: string;
        email: string;
        username: string;
    } | null;
    token: string | null;
    refreshToken: string | null;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    loading: false,
    error: null
};

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: { email: string; password: string }) => {
        const response = await AuthService.login(credentials);
        return response;
    }
);

export const register = createAsyncThunk(
    'auth/register',
    async (data: { email: string; password: string; username: string }) => {
        const response = await AuthService.register(data);
        return response;
    }
);

export const refreshTokenAsync = createAsyncThunk(
    'auth/refreshToken',
    async (_, { getState }) => {
        const state: any = getState();
        const refreshToken = state.auth.refreshToken;
        const response = await AuthService.refreshToken(refreshToken);
        return response;
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.tokens.accessToken;
                state.refreshToken = action.payload.tokens.refreshToken;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Login failed';
            });

        // Register
        builder
            .addCase(register.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.tokens.accessToken;
                state.refreshToken = action.payload.tokens.refreshToken;
            })
            .addCase(register.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Registration failed';
            });

        // Refresh Token
        builder
            .addCase(refreshTokenAsync.pending, (state) => {
                state.loading = true;
            })
            .addCase(refreshTokenAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.accessToken;
            })
            .addCase(refreshTokenAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Token refresh failed';
                // On refresh token failure, log out the user
                state.user = null;
                state.token = null;
                state.refreshToken = null;
            });
    }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;