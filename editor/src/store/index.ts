import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './slices/authSlice';
import projectReducer from './slices/projectSlice';
import editorReducer from './slices/editorSlice';

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['auth'] // Only persist auth state
};

const rootReducer = combineReducers({
    auth: authReducer,
    project: projectReducer,
    editor: editorReducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST']
            }
        })
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;